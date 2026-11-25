import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './LandingPage.css'; // Add CSS for styling

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar />
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hero-section"
      >
        <h1>Welcome to Brandfluence</h1>
        <p>Where Brands Meet Creators for Impactful Collaborations</p>
        <div className="buttons">
          <button onClick={() => (window.location.href = '/brand/signup')}>I am a Brand</button>
          <button onClick={() => (window.location.href = '/creator/signup')}>I am a Creator</button>
        </div>
      </motion.section>

      {/* Influencer Posts Section */}
      <section className="influencer-posts-section" id="influencer-posts">
        <h2>Influencer Highlights</h2>
        <div className="posts-gallery">
          <div className="gallery-wrapper">
            <img src="/influencer1.jpg" alt="Influencer " />
            <img src="/influencer2.jpg" alt="Influencer 2" />
            <img src="/influencer3.jpg" alt="Influencer 3" />
            <img src="/influencer4.jpg" alt="Influencer 4" />
            <img src="/influencer5.jpg" alt="Influencer 5" />
          </div>
        </div>
      </section>


      {/* Quality Video Section */}
      <section className="quality-video-section" id="quality-video">
        <h2>Experience the Power of Brandfluence</h2>
        <p>Discover how our platform empowers brands and creators to collaborate seamlessly and create impactful campaigns.</p>
        <div className="video-container">
          <video autoPlay loop muted playsInline poster="/video-thumbnail.jpg" className="quality-video">
            <source
              src="https://res.cloudinary.com/dy8ciqewi/video/upload/v1707907357/Comp-1_1-1_1888093578.mp4?_i=AA"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>
      </section>


      {/* About Us Section */}
      <section className="about-section" id="about">
        <h2>About Us</h2>
        <div className="about-content">
          <div className="about-item">
            <span className="icon">🌟</span>
            <h3>Connect</h3>
            <p>We bring brands and creators together to create magic.</p>
          </div>
          <div className="about-item">
            <span className="icon">🚀</span>
            <h3>Collaborate</h3>
            <p>Our platform makes collaboration seamless and fun.</p>
          </div>
          <div className="about-item">
            <span className="icon">💡</span>
            <h3>Create</h3>
            <p>Turn ideas into impactful campaigns with ease.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" id="testimonials">
        <h2>What Our Clients Say</h2>
        <div className="testimonials">
          <div className="testimonial-card">
            <p>"Brandfluence helped us grow our brand exponentially!"</p>
            <p className="client-name">- Nutella</p>
          </div>
          <div className="testimonial-card">
            <p>"Amazing platform for creators! Highly recommended."</p>
            <p className="client-name">- Rohit Sharma</p>
          </div>
        </div>
        <div className="client-logos">
          <img src="/logo2.png" alt="client 2" />
          <img src="/logo3.png" alt="client 3" />
          <img src="/logo4.png" alt="client 4" />
          <img src="/logo6.png" alt="client 6" />
          <img src="/logo7.png" alt="client 7" />
          <img src="/logo9.png" alt="client 9" />
        </div>
      </section>


      <Footer />
    </div>
  );
};

export default LandingPage;