import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { BrowserRouter } from "react-router-dom";

import { Grommet } from 'grommet';


const theme = {
  global: {
    colors: {
      "accent-2": "#547aa5",
      "accent-1": "#FD5200",
      "accent-3": "FCFCFC",
      brand: '#252422',
    },
  },
};

ReactDOM.render(
  <React.StrictMode>
    <Grommet plain theme={theme} themeMode="dark" style={{ height: '100%' }}>

      <BrowserRouter basename="/bossman">
        <App />
      </BrowserRouter>

    </Grommet>
  </React.StrictMode>,
  document.getElementById('root')
);
