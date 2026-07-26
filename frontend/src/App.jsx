import { Route, Routes } from "react-router";

import Navbar from "./components/Navbar";
import Compare from "./pages/Compare";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";

import "./App.css";

function App() {
  return (
    <div className="app">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/compare" element={<Compare />} />
      </Routes>
    </div>
  );
}

export default App;
