import {useEffect, useState, useRef} from "react";
import mapboxgl from "mapbox-gl";
import Loader from "../Loader/Loader.jsx";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZmlnaHRlci0xMCIsImEiOiJjbTgwN2Y4YzcwcWpmMmpzYWJiOHlxN2U1In0.qQm20AenfEZmnr_VNRDTTA";

const MapApi = ({ setFormData, route, drawRoute, mapRef }) => {
    const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v12");
    const mapContainerRef = useRef(null);
    const [loader, setLoader] = useState(true);

    useEffect(() => {
        setLoader(true)
        mapboxgl.accessToken = MAPBOX_TOKEN;
        if (!mapRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: mapStyle,
                center: [-95.7129, 37.0902], // Centered on the US
                zoom: 3,

            });
        } else {
            mapRef.current.setStyle(mapStyle);
            mapRef.current.once("style.load", () => {
                if (route) {
                    drawRoute(mapRef, route);
                }
                setLoader(false);
            });
        }
    }, [mapStyle]);

    const changeMapStyle = () => {
        setMapStyle(mapStyle === "mapbox://styles/mapbox/streets-v12" ?
            "mapbox://styles/mapbox/satellite-streets-v12"
            :
            "mapbox://styles/mapbox/streets-v12");
    };

    return (
        <div style={{ position: "relative", borderRadius: "20px",
            background: "black", pointerEvents: loader? "none" : "all" }}>
            <Loader show={loader} />
            <div id="map" ref={mapContainerRef} style={{opacity: loader? "0.7" : "1"}}>
            </div>
            <div onClick={changeMapStyle}
                 style={{opacity: loader? "0.7" : "1"}}
                 className={(mapStyle === "mapbox://styles/mapbox/satellite-streets-v12") ? "satellite-button" : "street-button"}>
                <span>{mapStyle === "mapbox://styles/mapbox/satellite-streets-v12" ? "Map" : "Satellite"}</span>
            </div>
        </div>
    );
};

export default MapApi;