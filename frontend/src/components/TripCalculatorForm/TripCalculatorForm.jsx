import {Button, CircularProgress, TextField, Typography} from "@mui/material";
import React, {useRef, useState, useContext} from "react";
import axios from "axios";
import {MessageContext} from "../TripPlanner";

const TripCalculatorForm = ({ setRoute, drawRoute, setTripLogs, formData,
                                setFormData, mapRef, setFormSubmitted }) => {
    const [loading, setLoading] = useState(false);
    const {showMessage, MAPBOX_TOKEN} = useContext(MessageContext);
    const currentRef = useRef(null);
    const pickupRef = useRef(null);
    const dropoffRef = useRef(null);
    const cycleRef = useRef(null);
    const [suggestions, setSuggestions] = useState({
        current_location: [],
        pickup_location: [],
        dropoff_location: []
    });
    const [validSelections, setValidSelections] = useState({
        current_location: false,
        pickup_location: false,
        dropoff_location: false
    });

    const [errors, setErrors] = useState({
        current_location: false,
        pickup_location: false,
        dropoff_location: false
    });
    const [selectedIndex, setSelectedIndex] = useState({
        current_location: -1,
        pickup_location: -1,
        dropoff_location: -1
    });

    const handleChange = (e) => {
        if (errors[e.target.name]) {
            setErrors({...errors, [e.target.name]: false});
        }
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const parseJSONError = (error) => {
        // Extract the JSON-like part and replace single quotes with double quotes
        const jsonString = error.replace(/Mapbox API Error: /, "").replace("}}", "}").replace(/'/g, '"');

        // Check if the string is a valid JSON
        try {
            let parsed = JSON.parse(jsonString);
            return parsed.message;
        } catch (e) {
            return jsonString;
        }
    };

    const handleKeyDown = (e, fieldName, nextRef) => {
        const suggestionList = suggestions[fieldName];
        if (suggestionList?.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => ({
                    ...prev,
                    [fieldName]: (prev[fieldName] + 1) % suggestionList.length
                }));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => ({
                    ...prev,
                    [fieldName]: (prev[fieldName] - 1 + suggestionList.length) % suggestionList.length
                }));
            } else if (e.key === "Enter" && selectedIndex[fieldName] !== -1) {
                e.preventDefault();
                handleSelectSuggestion(fieldName, suggestionList[selectedIndex[fieldName]].coordinates);
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (errors[e.target.name] || suggestions[e.target.name]?.length > 0) {
                // If there's an error, don't proceed
                return;
            }
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            } else {
                // Unfocus the last input
                e.target.blur();
                // If there's no next ref, submit the form:
                calculateTrip();
            }
        }
    };

    const handlePlaceSearch = async (query, fieldName) => {
        const isCoordinates = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(query.trim());

        if (!query) {
            setSuggestions(prev => ({...prev, [fieldName]: []}));
            setValidSelections(prev => ({...prev, [fieldName]: false})); // Mark as invalid
            return;
        }

        if (isCoordinates) {
            setSuggestions(prev => ({
                ...prev,
                [fieldName]: [{name: "Manual Coordinates", coordinates: query.trim()}]
            }));
            setValidSelections(prev => ({...prev, [fieldName]: true})); // Mark as valid
            return;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}` +
            `.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=place,address,poi`;

        try {
            const response = await axios.get(url);
            const places = response.data?.features?.map(feature => ({
                name: feature.place_name,
                coordinates: feature.center.join(",") // Format as "lng,lat"
            }));

            setSuggestions(prev => ({...prev, [fieldName]: places}));
            setValidSelections(prev => ({...prev, [fieldName]: false})); // Reset until user selects
        } catch (error) {
            const errorData = parseJSONError(error.response?.data?.error);
            showMessage(errorData || "Failed to fetch suggestions.", true);
            setSuggestions(prev => ({...prev, [fieldName]: []}));
            setValidSelections(prev => ({...prev, [fieldName]: false}));
        }
    };

    const handleSelectSuggestion = (fieldName, coordinates) => {
        setFormData(prev => ({...prev, [fieldName]: coordinates}));
        setValidSelections(prev => ({...prev, [fieldName]: true})); // Mark as valid
        setSuggestions(prev => ({...prev, [fieldName]: []})); // Clear suggestions
    };

    const calculateTrip = async () => {
        let hasErrors = false;
        const newErrors = {};

        // Check if all locations are valid
        ["current_location", "pickup_location", "dropoff_location"].forEach(field => {
            if (!validSelections[field]) {
                newErrors[field] = true;
                hasErrors = true;
            }
        });

        if (hasErrors) {
            setErrors(newErrors);
            showMessage("Please select a valid location for all fields.", true);
            return;
        }

        setErrors({current_location: false, pickup_location: false, dropoff_location: false});

        const validLocations = [
            formData.current_location.trim(),
            formData.pickup_location.trim(),
            formData.dropoff_location.trim()
        ].map(loc => {
            const [lng, lat] = loc.split(",").map(Number);
            return `${lng},${lat}`;
        });

        const proxyUrl = `https://tripplanner.pythonanywhere.com/proxy-mapbox/?locations=${validLocations.join(";")}` +
            `&cycle=${formData.current_cycle_used}`;
        setLoading(true);

        try {
            const response = await axios.get(proxyUrl);
            setLoading(false);

            if (!response.data.routes || response.data.routes.length === 0) {
                showMessage("No routes found. Check locations.", null);
                return;
            }

            setFormSubmitted(true);
            setRoute(response.data.routes[0]);
            drawRoute(mapRef, response.data.routes[0]);
            setTripLogs(response.data.trip_logs || []);
        } catch (error) {
            const errorData = parseJSONError(error.response?.data?.error);
            showMessage(errorData || "Failed to fetch route.", true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{position: "relative"}}>
            <Typography variant="h4" gutterBottom>🚛 Trip Calculator</Typography>
            <TextField
                label="Current Location"
                name="current_location"
                fullWidth
                margin="normal"
                placeholder="Enter city name or use lng,lat (e.g., -90.1994, 38.6270)"
                helperText="You can enter a place name or latitude,longitude (lng,lat) format."
                inputRef={currentRef}
                error={errors.current_location}
                onKeyDown={(e) =>
                    handleKeyDown(e, "current_location", pickupRef)}
                value={formData.current_location}
                onChange={(e) => {
                    handleChange(e);
                    handlePlaceSearch(e.target.value, "current_location");
                }}
            />
            {suggestions.current_location.length > 0 && (
                <ul className="autocomplete-list">
                    {suggestions.current_location.map((place, index) => (
                        <li
                            key={index}
                            className={index === selectedIndex.current_location ? "highlighted" : ""}
                            onMouseEnter={() => setSelectedIndex(prev => ({ ...prev, current_location: index }))}
                            onClick={() => handleSelectSuggestion("current_location", place.coordinates)}
                        >
                            {place.name}
                        </li>
                    ))}
                </ul>
            )}

            <TextField
                label="Pickup Location"
                name="pickup_location"
                fullWidth
                margin="normal"
                placeholder="Enter city name or use lng,lat (e.g., -90.1994, 38.6270)"
                helperText="You can enter a place name or latitude,longitude (lng,lat) format."
                inputRef={pickupRef}
                error={errors.pickup_location}
                onKeyDown={(e) =>
                    handleKeyDown(e, "pickup_location", dropoffRef)}
                value={formData.pickup_location}
                onChange={(e) => {
                    handleChange(e);
                    handlePlaceSearch(e.target.value, "pickup_location");
                }}
            />
            {suggestions.pickup_location.length > 0 && (
                <ul className="autocomplete-list">
                    {suggestions.pickup_location.map((place, index) => (
                        <li
                            key={index}
                            className={index === selectedIndex.pickup_location ? "highlighted" : ""}
                            onMouseEnter={() => setSelectedIndex(prev => ({...prev, pickup_location: index}))}
                            onClick={() => handleSelectSuggestion("pickup_location", place.coordinates)}
                        >
                            {place.name}
                        </li>
                    ))}
                </ul>
            )}

            <TextField
                label="Dropoff Location"
                name="dropoff_location"
                fullWidth
                margin="normal"
                placeholder="Enter city name or use lng,lat (e.g., -90.1994, 38.6270)"
                helperText="You can enter a place name or latitude,longitude (lng,lat) format."
                inputRef={dropoffRef}
                error={errors.dropoff_location}
                onKeyDown={(e) =>
                    handleKeyDown(e, "dropoff_location", cycleRef)}
                value={formData.dropoff_location}
                onChange={(e) => {
                    handleChange(e);
                    handlePlaceSearch(e.target.value, "dropoff_location");
                }}
            />
            {suggestions.dropoff_location.length > 0 && (
                <ul className="autocomplete-list">
                    {suggestions.dropoff_location.map((place, index) => (
                        <li
                            key={index}
                            className={index === selectedIndex.dropoff_location ? "highlighted" : ""}
                            onMouseEnter={() => setSelectedIndex(prev => ({...prev, dropoff_location: index}))}
                            onClick={() => handleSelectSuggestion("dropoff_location", place.coordinates)}
                        >
                            {place.name}
                        </li>
                    ))}
                </ul>
            )}
            <TextField label="Current Cycle Used (hours)"
                       inputRef={cycleRef}
                       onKeyDown={(e) =>
                           handleKeyDown(e, "current_cycle_used", null)}
                       name="current_cycle_used" fullWidth margin="normal"
                       value={formData.current_cycle_used} type="number" onChange={handleChange}/>
            <Button variant="contained" color="primary" onClick={calculateTrip} style={{marginTop: "20px"}}>
                {loading ? <CircularProgress size={24} color="inherit"/> : "Calculate Trip"}
            </Button>
        </div>
    )
};

export default TripCalculatorForm;