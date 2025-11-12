import React, { useEffect } from 'react';

export default function BannerSlider() {
  useEffect(() => {
    // Bootstrap carousel initialization
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <link 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" 
        rel="stylesheet" 
      />
      
      <div className="container-fluid p-0">
        <div id="bannerCarousel" className="carousel slide carousel-fade" data-bs-ride="carousel" data-bs-interval="3000">
          {/* Indicators */}
          <div className="carousel-indicators">
            <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
            <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
            <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
            <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="3" aria-label="Slide 4"></button>
          </div>

          {/* Slides */}
          <div className="carousel-inner">
            <div className="carousel-item active">
              <img 
                src="https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=500&fit=crop" 
                className="d-block w-100" 
                alt="Modern Technology"
                style={{ height: '500px', objectFit: 'cover' }}
              />
              <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 p-3 rounded">
                <h2 className="display-4 fw-bold">Welcome to Our Store</h2>
                <p className="lead">Discover amazing products and great deals</p>
                <button className="btn btn-primary btn-lg">Shop Now</button>
              </div>
            </div>

            <div className="carousel-item">
              <img 
                src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=500&fit=crop" 
                className="d-block w-100" 
                alt="Fashion Collection"
                style={{ height: '500px', objectFit: 'cover' }}
              />
              <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 p-3 rounded">
                <h2 className="display-4 fw-bold">Latest Fashion Collection</h2>
                <p className="lead">Trendy styles for every season</p>
                <button className="btn btn-warning btn-lg">Explore Collection</button>
              </div>
            </div>

            <div className="carousel-item">
              <img 
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop" 
                className="d-block w-100" 
                alt="Shopping Experience"
                style={{ height: '500px', objectFit: 'cover' }}
              />
              <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 p-3 rounded">
                <h2 className="display-4 fw-bold">Special Offers</h2>
                <p className="lead">Up to 50% off on selected items</p>
                <button className="btn btn-success btn-lg">Get Deals</button>
              </div>
            </div>

            <div className="carousel-item">
              <img 
                src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=500&fit=crop" 
                className="d-block w-100" 
                alt="Premium Products"
                style={{ height: '500px', objectFit: 'cover' }}
              />
              <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 p-3 rounded">
                <h2 className="display-4 fw-bold">Premium Quality</h2>
                <p className="lead">Experience luxury and comfort</p>
                <button className="btn btn-danger btn-lg">Learn More</button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <button className="carousel-control-prev" type="button" data-bs-target="#bannerCarousel" data-bs-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target="#bannerCarousel" data-bs-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </div>
    </>
  );
}