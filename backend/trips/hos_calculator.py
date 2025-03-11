from datetime import datetime, timedelta
from geopy.distance import geodesic
import math

AVERAGE_SPEED = 55
FUEL_STOP_INTERVAL = 1000
FUELING_TIME = 0.5
PICKUP_DROPOFF_TIME = 1
MAX_DRIVING_HOURS_PER_DAY = 11
MAX_ON_DUTY_HOURS_PER_DAY = 14
BREAK_REQUIRED_AFTER = 8
BREAK_DURATION = 0.5
CYCLE_LIMIT = 70

def calculate_trip_logs(current_location, pickup_location, dropoff_location, current_cycle_used):
    distance_to_pickup = geodesic(current_location, pickup_location).miles
    trip_distance = geodesic(pickup_location, dropoff_location).miles
    total_distance = distance_to_pickup + trip_distance
    total_fueling_stops = math.ceil(trip_distance / FUEL_STOP_INTERVAL)
    total_fueling_time = total_fueling_stops * FUELING_TIME

    logs = []
    current_date = datetime.now()
    remaining_trip_distance = trip_distance

    while remaining_trip_distance > 0:
        driving_hours_today = min(MAX_DRIVING_HOURS_PER_DAY, remaining_trip_distance / AVERAGE_SPEED)
        on_duty_hours_today = min(driving_hours_today + total_fueling_time, MAX_ON_DUTY_HOURS_PER_DAY)

        logs.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'driving_hours': round(driving_hours_today, 2),
            'on_duty_hours': round(on_duty_hours_today, 2),
            'off_duty_hours': 10,
            'remarks': [f"Driving {round(driving_hours_today, 2)} hours, Fuel Stops: {total_fueling_stops}"]
        })

        remaining_trip_distance -= AVERAGE_SPEED * driving_hours_today
        current_date += timedelta(days=1)

    return logs
