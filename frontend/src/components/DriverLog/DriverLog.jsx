import {
    Box,
    Container,
    Grid,
    Paper,
    Table, TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import {useEffect, useState} from "react";
import Loader from "../Loader/Loader.jsx";

// Define duty statuses and their colors for the grid
const dutyStatuses = ["Off Duty", "Sleeper Berth", "Driving", "On Duty (not driving)"];
const statusColors = {
    0: "#4caf50", // Off Duty: green
    1: "#9c27b0", // Sleeper: purple
    2: "#f44336", // Driving: red
    3: "#ff9800"  // On Duty: orange
};

const DriverLog = ({tripLogs}) => {
    // **State for Selection**
    const [selected70Hour, setSelected70Hour] = useState(null);
    const [selected60Hour, setSelected60Hour] = useState(null);
    const [loader, setLoader] = useState(true);

    const handleSelect = (category, option) => {
        if (category === "70") {
            setSelected70Hour(option);
        } else {
            setSelected60Hour(option);
        }
    };

    useEffect(() => {
        if (tripLogs.length > 0) {
            setLoader(false);
        }
    }, [tripLogs]);

    return (
        <Container maxWidth="md" className="daily-log-container" sx={{mt: 4, position: "relative"}}>
            {
                loader && <Loader show={loader} />
            }
            <span style={{pointerEvents: loader? "none" : "all", opacity: loader? "0" : "1"}}>
                {/* Header Section */}
                <div className="log-first-row" style={{marginBottom: "20px"}}>
                    <div className="log-title">
                        <h2>Drivers Daily Log</h2>
                        <span className="sub-title">(24 hours)</span>
                    </div>
                    <div className="date-section" style={{display: "flex", justifyContent: "center", gap: "10px"}}>
                <span className="log-date-item">
                  <span className="log-date-field"><span className="date-divider">{tripLogs[0]?.date?.split("-")[1]}</span> /</span>
                  <span className="log-date-label">(month)</span>
                </span>
                        <span className="log-date-item">
                  <span className="log-date-field"><span className="date-divider">{tripLogs[0]?.date?.split("-")[2]}</span> /</span>
                  <span className="log-date-label">(day)</span>
                </span>
                        <span className="log-date-item">
                  <span className="log-date-field"><span className="date-divider">{tripLogs[0]?.date?.split("-")[0]}</span> /</span>
                  <span className="log-date-label">(year)</span>
                </span>
                    </div>
                    <div className="filing-info">
                        <span><strong>Original</strong> - File at home terminal.</span>
                        <span><strong>Duplicate</strong> - Driver retains in possession for 8 days.</span>
                    </div>
                </div>

                {/* From/To Section */}
                <div className="from-to-section"
                     style={{display: "flex", justifyContent: "space-around", marginBottom: "20px"}}>
                    <div className="from-to">
                        <label><strong>From:</strong></label>
                        <div className="input-line">
                            {tripLogs[0]?.from_location}
                        </div>
                    </div>
                    <div className="from-to">
                        <label><strong>To:</strong></label>
                        <div className="input-line">
                            {tripLogs[0]?.to_location}
                        </div>
                    </div>
                </div>

                {/* Mileage & Truck Info Section */}
                <div className="mileage-address-container"
                     style={{display: "flex", justifyContent: "space-between", marginBottom: "20px"}}>
                    <div className="mileage-section" style={{flex: 1, marginRight: "10px"}}>
                        <div>
                            <Box className="short-input">{tripLogs[0]?.total_miles_driving_today}</Box>
                            <label>Total Miles Driving Today</label>
                        </div>
                        <div>
                            <Box className="short-input">{tripLogs[0]?.total_mileage_today}</Box>
                            <label>Total Mileage Today</label>
                        </div>
                        <div>
                            <Box className="short-input">{tripLogs[0]?.truck_or_tractor_trailer_numbers}</Box>
                            <label>Truck/Tractor & Trailer Numbers or License Plate[s]/State</label>
                        </div>
                    </div>
                    <div className="address-section" style={{flex: 1, marginLeft: "10px"}}>
                        <div className="carrier-name">
                            <div className="input-line" style={{borderBottom: "1px solid #000", marginBottom: "5px"}}>
                                {tripLogs[0]?.carrier_name}
                            </div>
                            <label><strong>Name of Carrier or Carriers</strong></label>
                        </div>
                        <div className="office-address">
                            <div className="input-line" style={{borderBottom: "1px solid #000", marginBottom: "5px"}}>
                                {tripLogs[0]?.main_office_address}
                            </div>
                            <label><strong>Main Office Address</strong></label>
                        </div>
                        <div className="terminal-address">
                            <div className="input-line" style={{borderBottom: "1px solid #000", marginBottom: "5px"}}>
                                {tripLogs[0]?.home_terminal_address}
                            </div>
                            <label><strong>Home Terminal Address</strong></label>
                        </div>
                    </div>
                </div>

                {/* ********************** Log Sheet Section ********************** */}
                {tripLogs?.map((dailyLog) => (
                    <Box key={dailyLog.date} sx={{mb: 4, border: "1px solid #ccc", p: 2}}>

                        {/* For each duty status row */}
                        {dutyStatuses?.map((status, rowIndex) => {
                            const totalHours = dailyLog.log_data.filter(entry =>
                                entry.status === rowIndex).length;

                            return (
                                <Grid container key={status} sx={{borderBottom: "1px solid #999"}}>
                                    {/* Label cell */}
                                    <Grid
                                        item
                                        sx={{
                                            width: "100px",
                                            borderRight: "1px solid #999",
                                            display: "flex",
                                            alignItems: "center",
                                            p: 1
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{fontWeight: "bold", textAlign: "center", width: "100%"}}
                                        >
                                            {status}
                                        </Typography>
                                    </Grid>

                                    {/* 24-hour grid (nested) */}
                                    <Grid item xs>
                                        <Grid container columns={24}>
                                            {Array.from({length: 24}).map((_, hour) => {
                                                const logEntry = dailyLog.log_data.find(entry => entry.hour === hour);
                                                const isActive = logEntry && logEntry.status === rowIndex;

                                                return (
                                                    <Grid
                                                        item
                                                        xs={1}
                                                        key={`${status}-${hour}`}
                                                        sx={{
                                                            borderRight: hour < 23 ? "1px solid #999" : "none",
                                                            height: 40,
                                                            p: 0 // no padding so sub-cells fill
                                                        }}
                                                    >
                                                        {/* 4 sub-cells for 1/4 hour increments */}
                                                        <Grid container columns={4} sx={{height: "100%"}}>
                                                            {Array.from({length: 4}).map((_, quarterIndex) => (
                                                                <Grid
                                                                    item
                                                                    xs={1}
                                                                    key={`quarter-${quarterIndex}`}
                                                                    sx={{
                                                                        borderRight: quarterIndex < 3 ? "1px solid #ddd" : "none",
                                                                        backgroundColor: isActive ? statusColors[rowIndex] : "transparent"
                                                                    }}
                                                                />
                                                            ))}
                                                        </Grid>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </Grid>

                                    {/* TOTAL HOURS cell */}
                                    <Grid
                                        item
                                        sx={{
                                            width: "80px",
                                            borderLeft: "1px solid #999",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <Typography variant="body2" sx={{fontWeight: "bold"}}>
                                            {totalHours}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            );
                        })}

                        {/* Hour Labels Row */}
                        <Grid container sx={{mt: 1}}>
                            {/* Left spacer cell (same width as label cell) */}
                            <Grid item sx={{width: "100px"}}/>

                            {/* 24-hour label grid (nested) */}
                            <Grid item xs>
                                <Grid container columns={24}>
                                    {Array.from({length: 24}).map((_, idx) => (
                                        <Grid item xs={1} key={`label-${idx}`} textAlign="center">
                                            <Typography variant="caption">{idx}</Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>

                            {/* HOURS column label (renamed from 'Total Hours') */}
                            <Grid
                                item
                                sx={{
                                    width: "80px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderLeft: "1px solid #999"
                                }}
                            >
                                <Typography variant="caption" sx={{fontWeight: "bold"}}>
                                    Hours
                                </Typography>
                            </Grid>
                        </Grid>

                        {/* FINAL 'Total' ROW */}
                        {(() => {
                            // Typically 24 if the entire day is accounted for,
                            // but you can sum each row's total if needed.
                            const totalDayHours = dailyLog.log_data.length;

                            return (
                                <Grid container sx={{borderTop: "1px solid #999"}}>
                                    {/* Left label cell: "Total" */}
                                    <Grid
                                        item
                                        sx={{
                                            width: "100px",
                                            borderRight: "1px solid #999",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <Typography variant="body2" sx={{fontWeight: "bold"}}>
                                            Total
                                        </Typography>
                                    </Grid>

                                    {/* Merge all 24-hour columns into a single empty cell */}
                                    <Grid item xs/>

                                    {/* Final cell showing total hours for the day */}
                                    <Grid
                                        item
                                        sx={{
                                            width: "80px",
                                            borderLeft: "1px solid #999",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <Typography variant="body2" sx={{fontWeight: "bold"}}>
                                            {totalDayHours}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            );
                        })()}
                    </Box>
                ))}

                {/* Remarks & Shipping Documents Section */}
                <Box sx={{mt: 4, p: 2, borderTop: "1px solid #000", borderBottom: "1px solid #000"}}>
                    <Grid container spacing={2}>
                        {/* Left side: Remarks */}
                        <Grid item xs={6} sx={{borderRight: "1px solid #000", paddingRight: "16px"}}>
                            <Typography variant="body2" sx={{fontWeight: "bold", mb: 1}}>
                                Remarks
                            </Typography>
                            <Box className="log-remarks">{
                                tripLogs[0]?.remarks?.map((line, idx) => (
                                    <div style={{textAlign: "Left"}} key={idx}>{line}</div>
                                ))
                            }</Box>

                        </Grid>

                        {/* Right side: Shipping Documents */}
                        <Grid item xs={6}>
                            <Typography variant="body2" sx={{fontWeight: "bold", mb: 1}}>
                                Shipping Documents:
                            </Typography>
                            <Typography variant="body2">DVL or Manifest No.</Typography>
                            <Box className="shipping-docs" sx={{border: "1px solid #000", height: 20, mb: 2, overflow: "hidden"}}>
                                {tripLogs[0]?.shipping_documents?.dvl_or_manifest_no}
                            </Box>

                            <Typography variant="body2">Shipper & Commodity</Typography>
                            <Box className="shipping-docs" sx={{border: "1px solid #000", height: 40, mb: 2, overflow: "hidden"}}>
                                {tripLogs[0]?.shipping_documents?.shipper_commodity}
                            </Box>
                        </Grid>
                    </Grid>

                    <Typography variant="body2" sx={{mt: 2, fontStyle: "italic"}}>
                        Enter name of place you reported and where released from work and when and where each change of duty
                        occurred.
                        Use time standard of home terminal.
                    </Typography>
                </Box>

                {/* HOS Summary Table */}
                <Container className="recap-container" sx={{mt: 4}}>
                    <div className="log-table-header-container">
                        <Typography variant="h6" className="recap-title">Recap: Complete at end of day</Typography>
                    </div>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow className="log-table-heading-row">
                                    <TableCell><strong>70 Hour / 8 Day</strong></TableCell>
                                    <TableCell><strong>60 Hour / 7 Day</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow className="log-table-body-row">
                                    {/* 70 Hour Selection */}
                                    <TableCell>
                                        {["A", "B", "C"].map(option => (
                                            <div
                                                key={option}
                                                className={`selectable ${selected70Hour === option ? "selected" : ""}`}
                                            >
                                                {option}. {option === "A" ? "Total hours on duty last 7 days" :
                                                option === "B" ? "Total hours available tomorrow (70 hr. minus A*)" :
                                                    "Total hours on duty last 5 days including today"}
                                            </div>
                                        ))}
                                    </TableCell>

                                    {/* 60 Hour Selection */}
                                    <TableCell>
                                        {["A", "B", "C"].map(option => (
                                            <div
                                                key={option}
                                                className={`selectable ${selected60Hour === option ? "selected" : ""}`}
                                            >
                                                {option}. {option === "A" ? "Total hours on duty last 7 days" :
                                                option === "B" ? "Total hours available tomorrow (60 hr. minus A*)" :
                                                    "Total hours on duty last 5 days including today"}
                                            </div>
                                        ))}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Container>
            </span>
        </Container>
    );
};

export default DriverLog;