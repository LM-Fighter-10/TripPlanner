import React, { useState, useRef, createContext } from "react";
import {
  Container, Collapse, Button
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import TripCalculatorForm from "./TripCalculatorForm/TripCalculatorForm.jsx";
import MapApi from "./MapApi/MapApi.jsx";
import DriverLog from "./DriverLog/DriverLog.jsx";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export const MessageContext = createContext();
const MAPBOX_TOKEN = "pk.eyJ1IjoiZmlnaHRlci0xMCIsImEiOiJjbTgwN2Y4YzcwcWpmMmpzYWJiOHlxN2U1In0.qQm20AenfEZmnr_VNRDTTA";

const TripPlanner = () => {
  const [formData, setFormData] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used: "",
  });
  const mapRef = useRef(null);
  const [tripLogs, setTripLogs] = useState([]);
  const [route, setRoute] = useState(null);
  const [messagesList, setMessagesList] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const drawRoute = (mapRef, routeGeometry) => {
    if (!mapRef.current || !routeGeometry) return;

    if (mapRef.current.getSource("route")) {
      mapRef.current.removeLayer("route");
      mapRef.current.removeSource("route");
    }

    mapRef.current.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: routeGeometry,
      },
    });

    mapRef.current.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {"line-join": "round", "line-cap": "round"},
      paint: {"line-color": "#3887be", "line-width": 5},
    });

    const coordinates = routeGeometry.coordinates;
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    mapRef.current.fitBounds(bounds, {padding: 50});
  };

  const showMessage = (msg, error = null) => {
    if (msg && (error === true || error === false)) {
      if (!messagesList.includes(msg)) {
        setMessagesList([...messagesList, msg])
        toast[error ? "error" : "success"](msg, {
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            userSelect: "none",
            gap: "10px",
            padding: "20px",
          },
          onClose: () => {
            setMessagesList(messagesList.filter((e) => e !== msg));
          },
        });
      }
    } else if (msg && error === null) {
      if (!messagesList.includes(msg)) {
        setMessagesList([...messagesList, msg])
        toast.info(msg, {
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            userSelect: "none",
            gap: "10px",
            padding: "20px",
          },
          onClose: () => {
            setMessagesList(messagesList.filter((e) => e !== msg));
          },
        });
      }
    }
  };

  return (
      <MessageContext.Provider value={{showMessage, MAPBOX_TOKEN}}>
        <Container maxWidth="md" style={{marginTop: "20px", textAlign: "center"}}>
          <ToastContainer style={{width: "fit-content"}}/>
          <Collapse in={!formSubmitted} timeout={500}>
            <TripCalculatorForm drawRoute={drawRoute} setRoute={setRoute} setTripLogs={setTripLogs}
                                setFormData={setFormData} formData={formData} mapRef={mapRef}
                                setFormSubmitted={setFormSubmitted}/>
          </Collapse>
          <Collapse in={formSubmitted} timeout={500}>
            <span>
              <div style={{textAlign: "left", paddingLeft: "10px"}}>
                <Button variant="outlined" startIcon={<ArrowBackIosNewIcon />} onClick={() => {
                  setFormSubmitted(false);
                  setRoute(null);
                  setTripLogs([]);
                  setFormData({
                    current_location: "",
                    pickup_location: "",
                    dropoff_location: "",
                    current_cycle_used: "",
                  })
                }}>
                  Back to Form
                </Button>
              </div>
              <MapApi route={route} drawRoute={drawRoute} mapRef={mapRef}/>
              <DriverLog tripLogs={tripLogs}/>
            </span>
          </Collapse>
        </Container>
      </MessageContext.Provider>
  );
};

export default TripPlanner;
