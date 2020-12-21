import React from 'react';
import { Route, Router } from 'react-router-dom';
import './App.css'
import Home from './pages/Home';
import Login from './pages/Login';





function App() {

  return (
    <div className="App">
      <Route exact path="/" component={Login} />
      <Route exact path="/home" component={Home} />
    </div>
  );
}

export default App;
