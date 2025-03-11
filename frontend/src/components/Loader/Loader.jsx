import React from 'react';
import './Loader.css';

const Loader = ({show=true, style = {}}) => {
    return show && (
        <div className="loader" style={{...style}}>
            <div className="circle"></div>
            <div className="circle"></div>
            <div className="circle"></div>
            <div className="circle"></div>
        </div>
    );
};

export default Loader;