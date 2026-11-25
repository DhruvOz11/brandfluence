import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Brandfluence</div>
      <div className="navbar-links">
        <Link to="/" className="navbar-link">Home</Link>

        <Link
          to={location.pathname} 
          className="navbar-link"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("about");
          }}
        >
          About
        </Link>

        <Link
          to={location.pathname}
          className="navbar-link"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("testimonials");
          }}
        >
          Testimonials
        </Link>

        <Link to="/admin/login" className="navbar-link">Admin Login</Link>
      </div>
    </nav>
  );
};

export default Navbar;
