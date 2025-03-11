import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, timedelta
import logging
from .hos_calculator import calculate_trip_logs

MAPBOX_SECRET_TOKEN = "pk.eyJ1IjoiZmlnaHRlci0xMCIsImEiOiJjbTgwN2Y4YzcwcWpmMmpzYWJiOHlxN2U1In0.qQm20AenfEZmnr_VNRDTTA"
logger = logging.getLogger(__name__)

MAX_ROUTE_DISTANCE_MILES = 2500  # Mapbox has a limit of around 4,000 km (~2,500 miles)

@csrf_exempt
def proxy_mapbox(request):
    try:
        locations = request.GET.get("locations", "").replace("\n", "").strip()
        cycle_used = float(request.GET.get("cycle", 0))

        if not locations:
            return JsonResponse({"error": "Missing locations parameter"}, status=400)

        # Automatically extract pickup and dropoff from the locations string:
        location_list = locations.split(";")
        if len(location_list) < 2:
            return JsonResponse({"error": "Not enough locations provided."}, status=400)
        pickup_location = location_list[0]
        dropoff_location = location_list[-1]

        url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{locations}?geometries=geojson&access_token={MAPBOX_SECRET_TOKEN}"
        response = requests.get(url)
        if response.status_code != 200:
            return JsonResponse({"error": f"Mapbox API Error: {response.json()}"}, status=500)

        route_data = response.json()
        if not route_data.get("routes"):
            return JsonResponse({"error": "No valid routes found"}, status=400)

        route_geometry = route_data["routes"][0]["geometry"]
        logs_response = generate_log_sheets(
            duration=route_data["routes"][0]["duration"] / 3600,
            cycle_used=cycle_used,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location
        )

        return JsonResponse({
            "routes": [route_geometry],
            "trip_logs": logs_response["trip_logs"]
        })

    except Exception as e:
        logger.exception(f"Error in proxy_mapbox: {e}")
        return JsonResponse({"error": f"Internal Server Error: {str(e)}"}, status=500)

def reverse_geocode(lat, lon, access_token=MAPBOX_SECRET_TOKEN):
    """
    Given latitude and longitude, use Mapbox reverse geocoding
    to return the full address (place_name).
    """
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lat},{lon}.json?types=address&access_token={access_token}"
    try:
        r = requests.get(url)
        r.raise_for_status()
        data = r.json()
        if data.get("features") and len(data["features"]) > 0:
            return data["features"][0]["place_name"]
    except Exception as e:
        logger.exception(f"Error in reverse_geocode: {e}")
    return f"{lat},{lon}"


def parse_coordinates(coord_str):
    """
    Splits a coordinate string ("lat,lng") into a tuple (lat, lng) as floats.
    """
    parts = coord_str.split(",")
    return float(parts[0].strip()), float(parts[1].strip())

def generate_log_sheets(duration, cycle_used, pickup_location, dropoff_location,
                        truck_info=None, carrier_info=None, shipping_info=None):
    """
    Assuming a 70-hour cycle limit.
    Each day:
      1) driving_time up to 11,
      2) on_duty_time = driving + fueling(0.5) + extra(1.0), capped at 14,
      3) check if cycle_used + on_duty_time exceeds 70, adjust,
      4) if cycle_used >= 70, no more driving,
      5) off_duty=10, remainder is sleeper, ...
    Returns dict with "trip_logs".
    """

    cycle_limit = 70.0  # or 60 if you prefer
    max_driving_hours = 11.0
    max_duty_hours = 14.0
    off_duty_hours = 10.0
    fueling_time = 0.5
    extra_time = 1.0
    avg_driving_speed = 50.0
    non_driving_speed = 2.0

    def round_to_quarter(x):
        return round(x * 4) / 4

    def overlap(a, b, c, d):
        return max(0, min(b, d) - max(a, c))

    # Reverse geocode
    pickup_lat, pickup_lon = parse_coordinates(pickup_location)
    dropoff_lat, dropoff_lon = parse_coordinates(dropoff_location)
    from_address = reverse_geocode(pickup_lat, pickup_lon)
    to_address = reverse_geocode(dropoff_lat, dropoff_lon)

    logs = []
    start_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    remaining_duration = float(duration)

    while remaining_duration > 0:
        if cycle_used >= cycle_limit:
            # No more on-duty time left in cycle
            break

        # Basic day calculations
        driving_time = min(remaining_duration, max_driving_hours)
        on_duty_time = driving_time + fueling_time + extra_time
        on_duty_time = min(on_duty_time, max_duty_hours)

        # Now apply cycle limit
        available_cycle = cycle_limit - cycle_used
        if on_duty_time > available_cycle:
            on_duty_time = available_cycle
            # Driving time can't exceed on-duty time
            if driving_time > on_duty_time:
                driving_time = on_duty_time

        # If the adjusted on_duty_time is 0, we can't drive
        if on_duty_time <= 0:
            break

        total_used = driving_time + on_duty_time + off_duty_hours
        sleeper_time = 24.0 - total_used
        if sleeper_time < 0:
            sleeper_time = 0

        driving_rnd = round_to_quarter(driving_time)
        on_duty_rnd = round_to_quarter(on_duty_time)
        off_duty_rnd = round_to_quarter(off_duty_hours)
        sleeper_rnd = round_to_quarter(sleeper_time)

        # Compute mileage
        total_miles_driving_today = round_to_quarter(driving_time * avg_driving_speed)
        extra_non_driving = fueling_time + extra_time
        total_mileage_today = round_to_quarter(total_miles_driving_today + extra_non_driving * non_driving_speed)

        # Boundaries in hours from midnight
        driving_end = driving_time
        on_duty_end = driving_time + on_duty_time
        off_duty_end = on_duty_end + off_duty_hours

        remarks = [
            f"Trip started at {start_time.strftime('%H:%M')}",
            f"From: {from_address}",
            f"To: {to_address}",
            f"Driving: {driving_rnd}h, On Duty: {on_duty_rnd}h, Off Duty: {off_duty_rnd}h, Sleeper: {sleeper_rnd}h",
            f"Cycle used so far: {round_to_quarter(cycle_used)} / {cycle_limit}"
        ]

        daily_log = {
            "date": start_time.strftime("%Y-%m-%d"),
            "driving_hours": driving_rnd,
            "on_duty_hours": on_duty_rnd,
            "off_duty_hours": off_duty_rnd,
            "sleeper_hours": sleeper_rnd,
            "total_miles_driving_today": total_miles_driving_today,
            "total_mileage_today": total_mileage_today,
            "from_location": from_address,
            "to_location": to_address,
            "truck_or_tractor_trailer_numbers": truck_info if truck_info else "N/A",
            "carrier_name": carrier_info if carrier_info else "N/A",
            "main_office_address": carrier_info if carrier_info else "N/A",
            "home_terminal_address": carrier_info if carrier_info else "N/A",
            "shipping_documents": shipping_info if shipping_info else {
                "dvl_or_manifest_no": "N/A",
                "shipper_commodity": "N/A"
            },
            "remarks": remarks,
            "log_data": []
        }

        # Build the hour-by-hour status
        for hour in range(24):
            hour_start = hour
            hour_end = hour + 1
            driving_overlap = overlap(hour_start, hour_end, 0, driving_end)
            on_duty_overlap = overlap(hour_start, hour_end, driving_end, on_duty_end)
            off_duty_overlap = overlap(hour_start, hour_end, on_duty_end, off_duty_end)
            sleeper_overlap = overlap(hour_start, hour_end, off_duty_end, 24)

            overlaps = [driving_overlap, sleeper_overlap, on_duty_overlap, off_duty_overlap]
            status_order = [2, 1, 3, 0]  # Driving=2, Sleeper=1, On Duty=3, Off Duty=0
            max_overlap = max(overlaps)
            idx = overlaps.index(max_overlap)
            status = status_order[idx]
            fraction = round_to_quarter(max_overlap)

            daily_log["log_data"].append({
                "hour": hour,
                "status": status,
                "fraction": fraction
            })

        logs.append(daily_log)

        # Update cycle_used
        cycle_used += on_duty_time
        remaining_duration -= driving_time
        start_time += timedelta(days=1)

    return {
        "trip_logs": logs
    }

# def generate_log_sheets(duration, cycle_used, pickup_location, dropoff_location,
#                         truck_info=None, carrier_info=None, shipping_info=None):
#     """
#     Generates ELD log sheets using a 24-cell log_data array.
#     For each day:
#       - driving_time: hours driving (max 11)
#       - on_duty_time: driving + fueling (0.5 hr) + pickup/dropoff (1 hr), capped at 14
#       - off_duty_hours: fixed at 10
#       - sleeper_hours: remainder of 24 hours
#
#     Then, for each hour (0 to 23), determine the dominant duty status:
#       - 2: Driving, 3: On Duty (not driving), 0: Off Duty, 1: Sleeper Berth.
#
#     All computed hour values are rounded to the nearest 0.25.
#
#     Extra fields are filled as follows:
#       - from_location and to_location are determined by reverse‑geocoding the input pickup_location
#         and dropoff_location (expected as "lat,lng").
#       - For truck_or_tractor_trailer_numbers, carrier_name, main_office_address, home_terminal_address,
#         and shipping_documents – if not provided, they are left as empty strings.
#
#     Returns a dict with:
#        - "trip_logs": list of daily logs
#     """
#     max_driving_hours = 11
#     max_duty_hours = 14
#     off_duty_hours = 10.0
#     fueling_time = 0.5  # hours for fueling
#     extra_time = 1.0  # pickup/dropoff time in hours
#     avg_driving_speed = 50  # mph for driving
#     non_driving_speed = 2  # mph for extra non-driving movement
#
#     logs = []
#     start_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
#     remaining_duration = float(duration)
#
#     def round_to_quarter(x):
#         return round(x * 4) / 4
#
#     def overlap(a, b, c, d):
#         return max(0, min(b, d) - max(a, c))
#
#     # Convert input pickup/dropoff coordinates to addresses using reverse geocoding.
#     pickup_lat, pickup_lon = parse_coordinates(pickup_location)
#     dropoff_lat, dropoff_lon = parse_coordinates(dropoff_location)
#     from_address = reverse_geocode(pickup_lat, pickup_lon)
#     to_address = reverse_geocode(dropoff_lat, dropoff_lon)
#
#     while remaining_duration > 0:
#         driving_time = min(remaining_duration, max_driving_hours)
#         on_duty_time = driving_time + fueling_time + extra_time
#         on_duty_time = min(on_duty_time, max_duty_hours)
#         total_used = driving_time + on_duty_time + off_duty_hours
#         sleeper_time = 24.0 - total_used
#         if sleeper_time < 0:
#             sleeper_time = 0
#
#         # Round times to nearest quarter
#         driving_rnd = round_to_quarter(driving_time)
#         on_duty_rnd = round_to_quarter(on_duty_time)
#         off_duty_rnd = round_to_quarter(off_duty_hours)
#         sleeper_rnd = round_to_quarter(sleeper_time)
#
#         # Calculate mileage values
#         total_miles_driving_today = round_to_quarter(driving_time * avg_driving_speed)
#         # Assume extra movement miles come from non-driving on-duty time (fueling + extra_time)
#         extra_non_driving = fueling_time + extra_time
#         total_mileage_today = round_to_quarter(total_miles_driving_today + extra_non_driving * non_driving_speed)
#
#         # Define region boundaries (in hours from midnight)
#         driving_end = driving_time
#         on_duty_end = driving_time + on_duty_time
#         off_duty_end = on_duty_end + off_duty_hours
#
#         # Build remarks summary:
#         remarks = [
#             f"Trip started at {start_time.strftime('%H:%M')}",
#             f"From: {from_address}",
#             f"To: {to_address}",
#             f"Driving: {driving_rnd}h, On Duty: {on_duty_rnd}h, Off Duty: {off_duty_rnd}h, Sleeper: {sleeper_rnd}h"
#         ]
#
#         daily_log = {
#             "date": start_time.strftime("%Y-%m-%d"),
#             "driving_hours": driving_rnd,
#             "on_duty_hours": on_duty_rnd,
#             "off_duty_hours": off_duty_rnd,
#             "sleeper_hours": sleeper_rnd,
#             "total_miles_driving_today": total_miles_driving_today,
#             "total_mileage_today": total_mileage_today,
#             "from_location": from_address,
#             "to_location": to_address,
#             "truck_or_tractor_trailer_numbers": truck_info if truck_info is not None else "N/A",
#             "carrier_name": carrier_info if carrier_info is not None else "N/A",
#             "main_office_address": carrier_info if carrier_info is not None else "N/A",
#             "home_terminal_address": carrier_info if carrier_info is not None else "N/A",
#             "shipping_documents": shipping_info if shipping_info is not None else {
#                 "dvl_or_manifest_no": "N/A",
#                 "shipper_commodity": "N/A"
#             },
#             "remarks": remarks,
#             "log_data": []
#         }
#
#         # For each hour, calculate overlap with each region
#         for hour in range(24):
#             hour_start = hour
#             hour_end = hour + 1
#             driving_overlap = overlap(hour_start, hour_end, 0, driving_end)
#             on_duty_overlap = overlap(hour_start, hour_end, driving_end, on_duty_end)
#             off_duty_overlap = overlap(hour_start, hour_end, on_duty_end, off_duty_end)
#             sleeper_overlap = overlap(hour_start, hour_end, off_duty_end, 24)
#
#             # Order: Driving=2, Sleeper=1, On Duty=3, Off Duty=0
#             overlaps = [driving_overlap, sleeper_overlap, on_duty_overlap, off_duty_overlap]
#             status_order = [2, 1, 3, 0]
#             max_overlap = max(overlaps)
#             idx = overlaps.index(max_overlap)
#             status = status_order[idx]
#             fraction = round_to_quarter(max_overlap)
#
#             daily_log["log_data"].append({
#                 "hour": hour,
#                 "status": status,
#                 "fraction": fraction
#             })
#
#         logs.append(daily_log)
#         remaining_duration -= driving_time
#         start_time += timedelta(days=1)
#
#     return {
#         "trip_logs": logs,
#     }
