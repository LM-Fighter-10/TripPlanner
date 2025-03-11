import {Button, CircularProgress, TextField, Typography} from "@mui/material";
import React, {useRef, useState, useContext} from "react";
import axios from "axios";
import {MessageContext} from "../TripPlanner";

const TripCalculatorForm = ({ setRoute, drawRoute, setTripLogs, formData,
                                setFormData, mapRef, formSubmitted, setFormSubmitted }) => {
    const [loading, setLoading] = useState(false);
    const {showMessage} = useContext(MessageContext);
    const currentRef = useRef(null);
    const pickupRef = useRef(null);
    const dropoffRef = useRef(null);
    const cycleRef = useRef(null);

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value.trim()});
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === "Enter") {
            e.preventDefault();
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

    const calculateTrip = async () => {
        if (!formData.current_location || !formData.pickup_location || !formData.dropoff_location || !formData.current_cycle_used) {
            showMessage("Please fill all fields.", true);
            return;
        }

        const locations = [
            formData.current_location.trim(),
            formData.pickup_location.trim(),
            formData.dropoff_location.trim(),
        ];

        const validLocations = locations.map(loc => {
            const [lat, lng] = loc.split(",").map(Number);
            return `${lat},${lng}`;
        });

        const proxyUrl = `http://127.0.0.1:8000/proxy-mapbox/?locations=${validLocations.join(";")}&cycle=${formData.current_cycle_used}`;
        setLoading(true);

        try {
            const response = await axios.get(proxyUrl);

            if (!response.data.routes || response.data.routes.length === 0) {
                showMessage("No routes found. Check locations.", null);
                setLoading(false);
                return;
            }

            setFormSubmitted(true);
            setRoute(response.data.routes[0]);
            drawRoute(mapRef, response.data.routes[0]);
            setTripLogs(response.data.trip_logs || []);
        } catch (error) {
            showMessage(error.response?.data?.message || "Failed to fetch route.", true);
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <Typography variant="h4" gutterBottom>🚛 Trip Calculator</Typography>
            <TextField label="Current Location (lat,lng)"
                       name="current_location" fullWidth margin="normal"
                       inputRef={currentRef}
                       onKeyDown={(e) => handleKeyDown(e, pickupRef)}
                       value={formData.current_location} onChange={handleChange}/>
            <TextField label="Pickup Location (lat,lng)"
                       name="pickup_location" fullWidth margin="normal"
                       inputRef={pickupRef}
                       onKeyDown={(e) => handleKeyDown(e, dropoffRef)}
                       value={formData.pickup_location} onChange={handleChange}/>
            <TextField label="Dropoff Location (lat,lng)"
                       inputRef={dropoffRef}
                       onKeyDown={(e) => handleKeyDown(e, cycleRef)}
                       name="dropoff_location" fullWidth margin="normal"
                       value={formData.dropoff_location} onChange={handleChange}/>
            <TextField label="Current Cycle Used (hours)"
                       inputRef={cycleRef}
                       onKeyDown={(e) => handleKeyDown(e, null)}
                       name="current_cycle_used" fullWidth margin="normal"
                       value={formData.current_cycle_used} type="number" onChange={handleChange}/>
            <Button variant="contained" color="primary" onClick={calculateTrip} style={{marginTop: "20px"}}>
                {loading ? <CircularProgress size={24} color="inherit"/> : "Calculate Trip"}
            </Button>
        </>
    )
};

export default TripCalculatorForm;