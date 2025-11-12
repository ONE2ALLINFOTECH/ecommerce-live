import React, { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Heart, Share2, Star, Truck, Shield, ChevronRight, Plus, Minus, Play, ZapOff, ChevronUp, ChevronDown } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API from '../../services/api';
import Navbar from '../UserHome/Navbar';
import { useDispatch, useSelector } from 'react-redux';
import { addToCartAPI, addItemToCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';

const VISITOR_STORAGE_KEY = 'visitor_id_v1';
function getVisitorId() {
  let id = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 48);
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
  }
  return id;
}

const ProductDetail = () => {
  const id = window.location.pathname.split('/').pop() || '1';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);

  // NEW: like state
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const visitorId = getVisitorId();

  const imageRef = useRef(null);
  const magnifierRef = useRef(null);
  const thumbnailContainerRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items } = useSelector(state => state.cart);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product?.images) {
      const mainIndex = product.images.findIndex(img => img.isMain);
      setSelectedImage(mainIndex >= 0 ? mainIndex : 0);
    }
  }, [product]);

  useEffect(() => {
    if (id) {
      fetchLikes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = { 'x-visitor-id': visitorId };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/products/${id}`);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikes = async () => {
    try {
      const { data } = await API.get(`/products/${id}/likes`, { headers: authHeaders() });
      setLikeCount(data?.count || 0);
      setLiked(!!data?.liked);
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
  };

  const toggleLike = async () => {
    if (!product?._id && !id) return;
    try {
      if (liked) {
        // optimistic
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        const { data } = await API.delete(`/products/${id}/like`, { headers: authHeaders() });
        setLikeCount(data?.count ?? 0);
        setLiked(!!data?.liked);
        toast.info('Removed from likes', { position: 'top-right', autoClose: 1500 });
      } else {
        setLiked(true);
        setLikeCount(prev => prev + 1);
        const { data } = await API.post(`/products/${id}/like`, {}, { headers: authHeaders() });
        setLikeCount(data?.count ?? 0);
        setLiked(!!data?.liked);
        toast.success('Added to likes', { position: 'top-right', autoClose: 1200 });
      }
    } catch (err) {
      // rollback on error
      setLiked(prev => !prev);
      setLikeCount(prev => (liked ? prev + 1 : Math.max(0, prev - 1)));
      console.error('Like toggle error:', err);
      toast.error('Could not update like. Try again.', { position: 'top-right' });
    }
  };

  const shareProduct = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name || 'Product',
          text: product?.description?.short || product?.name || '',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!', { position: 'top-right', autoClose: 1200 });
      }
    } catch (e) {
      // Even if user cancels, it's fine—no error toast required
      if (e?.name !== 'AbortError') {
        console.error('Share error:', e);
        toast.error('Unable to share. Link copied instead.');
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      }
    }
  };

  const handleQuantityChange = (type) => {
    if (type === 'increment' && quantity < product?.stockQuantity) {
      setQuantity(quantity + 1);
    } else if (type === 'decrement' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    const productData = {
      productId: id,
      name: product.name,
      sellingPrice: product.sellingPrice,
      image: product.images[0]?.url,
      quantity: quantity
    };

    try {
      if (token) {
        await dispatch(addToCartAPI(productData)).unwrap();
      } else {
        dispatch(addItemToCart(productData));
      }

      toast.success(
        <div className="flex items-center gap-3">
          <img 
            src={product.images[0]?.url} 
            alt={product.name}
            className="w-12 h-12 object-cover rounded border"
          />
          <div>
            <p className="font-semibold text-green-700">Successfully added to cart!</p>
            <p className="text-sm text-gray-600">{product.name}</p>
            <p className="text-sm font-medium">Quantity: {quantity}</p>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

    } catch (err) {
      console.error('Error adding to cart:', err);
      dispatch(addItemToCart(productData));

      toast.success(
        <div className="flex items-center gap-3">
          <img 
            src={product.images[0]?.url} 
            alt={product.name}
            className="w-12 h-12 object-cover rounded border"
          />
          <div>
            <p className="font-semibold text-green-700">Added to cart!</p>
            <p className="text-sm text-gray-600">{product.name}</p>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    }
  };

  const handleBuyNow = () => {
    handleAddToCart().then(() => {
      toast.info(
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-blue-700">Redirecting to cart...</p>
            <p className="text-sm text-gray-600">Completing your purchase</p>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: true,
        }
      );

      setTimeout(() => {
        navigate('/cart');
      }, 1500);
    });
  };

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    setMagnifierPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseEnter = () => {
    if (window.innerWidth >= 1024) {
      setShowMagnifier(true);
    }
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const scrollThumbnails = (direction) => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = 60;
      thumbnailContainerRef.current.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getCategoryName = (category) => {
    if (!category) return 'Products';
    if (typeof category === 'string') return category;
    if (typeof category === 'object' && category.name) return category.name;
    return 'Products';
  };

  const getBrandName = (brand) => {
    if (!brand) return null;
    if (typeof brand === 'string') return brand;
    if (typeof brand === 'object' && brand.name) return brand.name;
    return null;
  };

  const getVideoThumb = (url) => {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return parts[0] + '/upload/so_0/' + parts[1].replace(/\.\w+$/, '.jpg');
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Product not found</h2>
      </div>
    );
  }

  const discount = product.originalPrice && product.sellingPrice
    ? Math.round(((product.originalPrice - product.sellingPrice) / product.originalPrice) * 100)
    : 0;

  const brandName = getBrandName(product.brand);
  const categoryName = getCategoryName(product.category);
  const mediaList = product.images || [];
  const selectedMedia = mediaList[selectedImage] || {};
  const hasOffers = product.offers && product.offers.length > 0;
  const displayedOffers = showAllOffers ? product.offers : (product.offers || []).slice(0, 3);
  const hasMoreThanFiveImages = mediaList.length > 5;

  return (
    <>
      <Navbar />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="bg-white min-h-screen">
        <div className="border-b bg-gray-50 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center text-xs text-gray-600">
              <span className="hover:text-blue-600 cursor-pointer">Home</span>
              <ChevronRight className="w-3 h-3 mx-1" />
              <span className="hover:text-blue-600 cursor-pointer">{categoryName}</span>
              <ChevronRight className="w-3 h-3 mx-1" />
              <span className="text-gray-900 truncate max-w-md">{product.name}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-0">
            <div className="lg:col-span-5 lg:pr-4 lg:sticky lg:top-4 lg:self-start">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex sm:flex-col gap-2 relative">
                  {hasMoreThanFiveImages && (
                    <button
                      onClick={() => scrollThumbnails('up')}
                      className="flex absolute -top-6 left-1/2 -translate-x-1/2 z-10 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-50"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-700" />
                    </button>
                  )}

                  <div 
                    ref={thumbnailContainerRef}
                    className={`flex sm:flex-col gap-2 ${
                      hasMoreThanFiveImages 
                        ? 'overflow-x-auto sm:overflow-y-auto sm:max-h-[320px] pb-2 sm:pb-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar]:hidden sm:[&::-webkit-scrollbar]:block' 
                        : 'overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0'
                    }`}
                  >
                    {mediaList.map((media, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`w-12 h-12 sm:w-12 sm:h-12 flex-shrink-0 rounded border overflow-hidden ${
                          selectedImage === index ? 'border-blue-500 border-2' : 'border-gray-300'
                        }`}
                      >
                        {media.mediaType === 'image' ? (
                          <img
                            src={media.url}
                            alt={`View ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <img
                              src={getVideoThumb(media.url)}
                              alt={`Video ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                              <Play className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {hasMoreThanFiveImages && (
                    <button
                      onClick={() => scrollThumbnails('down')}
                      className="flex absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-50"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  <div className="bg-white border rounded-sm p-3 sm:p-3">
                    {/* ICONS OVERLAY ON IMAGE */}
                    <div className="relative">
                      <div
                        ref={imageRef}
                        className="relative overflow-hidden cursor-crosshair mb-4 bg-gray-50 border border-gray-200"
                        style={{ height: window.innerWidth < 640 ? '300px' : '450px' }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                      >
                        {/* Like / Share overlay (top-right) */}
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                          <button
                            onClick={toggleLike}
                            className="p-2 hover:bg-gray-100 rounded-full bg-white shadow-sm flex items-center gap-1"
                            aria-label={liked ? 'Unlike product' : 'Like product'}
                            title={liked ? 'Unlike' : 'Like'}
                          >
                            <Heart
                              className={`w-4 h-4 sm:w-5 sm:h-5 ${liked ? 'text-red-500' : 'text-gray-600'}`}
                              fill={liked ? 'currentColor' : 'none'}
                            />
                            <span className="text-xs font-medium text-gray-700 min-w-[18px] text-center">
                              {likeCount}
                            </span>
                          </button>
                          <button
                            onClick={shareProduct}
                            className="p-2 hover:bg-gray-100 rounded-full bg-white shadow-sm"
                            aria-label="Share product"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          </button>
                        </div>

                        {selectedMedia.mediaType === 'image' ? (
                          <img
                            src={selectedMedia.url || 'https://via.placeholder.com/500'}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video
                            src={selectedMedia.url}
                            controls
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>

                      {showMagnifier && window.innerWidth >= 1024 && selectedMedia.mediaType === 'image' && (
                        <div
                          ref={magnifierRef}
                          className="fixed bg-white border border-gray-300 z-50 hidden lg:block pointer-events-none overflow-hidden shadow-lg"
                          style={{
                            width: '820px',
                            height: '600px',
                            left: 'calc(50% - 100px)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: showMagnifier ? 'block' : 'none'
                          }}
                        >
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundImage: `url(${selectedMedia.url})`,
                              backgroundSize: '200%',
                              backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                              backgroundRepeat: 'no-repeat'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center mb-4">
                      <div className="flex items-center border border-gray-300 rounded-sm">
                        <button
                          onClick={() => handleQuantityChange('decrement')}
                          className="p-2 hover:bg-gray-100"
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-2 border-l border-r border-gray-300 min-w-[60px] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange('increment')}
                          className="p-2 hover:bg-gray-100"
                          disabled={quantity >= product.stockQuantity}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleAddToCart}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-sm shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                        ADD TO CART
                      </button>
                      <button
                        onClick={handleBuyNow}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-sm shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <ZapOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        BUY NOW
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE INFO (unchanged except like/share is on image) */}
            <div className="lg:col-span-7 lg:pl-6">
              <div className="border-b pb-4 mb-4">
                {brandName && (
                  <div className="text-xs sm:text-sm text-gray-500 mb-2">
                    Visit the <span className="text-blue-600 hover:underline cursor-pointer font-medium">{brandName} Store</span>
                  </div>
                )}

                <h1 className="text-base sm:text-lg font-medium text-gray-800 mb-3 leading-snug">{product.name}</h1>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-sm text-xs font-semibold">
                      <span>{product.rating?.toFixed(1) || '4.0'}</span>
                      <Star className="w-3 h-3 fill-white" />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      {(product.reviewCount || 1000).toLocaleString()} Ratings & {(product.reviewCount || 1000).toLocaleString()} Reviews
                    </span>
                  </div>
                </div>

                {discount > 0 && (
                  <div className="inline-block bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-sm">
                    Extra ₹{Math.round(product.sellingPrice * 0.1)} off
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl font-medium text-gray-900">₹{product.sellingPrice?.toLocaleString('en-IN')}</span>
                  {product.originalPrice && product.originalPrice > product.sellingPrice && (
                    <>
                      <span className="text-base sm:text-lg text-gray-500 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                      <span className="text-sm sm:text-base text-green-600 font-medium">{discount}% off</span>
                    </>
                  )}
                </div>
                {product.sellingPrice && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600">+ ₹{Math.round(product.sellingPrice * 0.18)} Secured Packaging Fee</span>
                  </div>
                )}
              </div>

              {hasOffers && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Available offers</h3>
                  <div className="space-y-3">
                    {displayedOffers.map((offer, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                        <span className="bg-green-600 text-white px-1.5 py-0.5 rounded-sm text-xs font-semibold flex-shrink-0 mt-0.5">OFFER</span>
                        <span className="text-gray-800 font-medium">{offer}</span>
                      </div>
                    ))}
                    {product.offers.length > 3 && (
                      <button
                        onClick={() => setShowAllOffers(!showAllOffers)}
                        className="text-blue-600 font-semibold text-xs sm:text-sm hover:underline"
                      >
                        {showAllOffers ? 'View less offers' : `View all ${product.offers.length} offers`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {product.colorOptions && Array.isArray(product.colorOptions) && product.colorOptions.length > 0 && (
                <div className="mb-6 flex flex-col sm:flex-row sm:items-start">
                  <span className="text-sm text-gray-500 sm:w-32 flex-shrink-0 mb-2 sm:mb-0">Color</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {product.colorOptions.map((color, index) => (
                        <button key={index} className="relative group">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gray-300 hover:border-blue-600 flex items-center justify-center overflow-hidden">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" style={{ backgroundColor: color.toLowerCase() }}></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <span className="text-sm text-gray-500 sm:w-32 flex-shrink-0 mb-2 sm:mb-0">Delivery</span>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Enter Delivery Pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="flex-1 sm:max-w-xs px-3 sm:px-4 py-2 border border-gray-300 rounded-sm text-sm focus:border-blue-500 focus:outline-none"
                        maxLength={6}
                      />
                      <button className="px-6 sm:px-8 py-2 text-blue-600 font-semibold text-sm hover:bg-blue-50 rounded-sm border sm:border-0">
                        Check
                      </button>
                    </div>
                    <div className="text-sm space-y-2">
                      <div className="flex items-start gap-2">
                        <Truck className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">Delivery by {product.estimatedDelivery || '5 Nov, Monday'}</div>
                          <div className="text-gray-600 text-xs mt-1">Free delivery on orders above ₹499</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {product.highlights && product.highlights.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start">
                    <span className="text-sm text-gray-500 sm:w-32 flex-shrink-0 mb-2 sm:mb-0">Highlights</span>
                    <div className="flex-1">
                      <ul className="text-sm text-gray-700 space-y-1.5">
                        {product.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1.5">•</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <span className="text-sm text-gray-500 sm:w-32 flex-shrink-0 mb-2 sm:mb-0">Services</span>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-x-6 sm:gap-y-2 text-sm text-gray-700">
                      {product.warrantyDetails && (
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-gray-600" />
                          <span>{product.warrantyDetails}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span>7 Days Replacement Policy</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-gray-600" />
                        <span>Cash on Delivery available</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <span className="text-sm text-gray-500 sm:w-32 flex-shrink-0 mb-2 sm:mb-0">Seller</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-600 text-sm font-semibold hover:underline cursor-pointer">Official Store</span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 bg-green-600 text-white px-1.5 py-0.5 rounded-sm text-xs font-semibold">
                          <span>4.5</span>
                          <Star className="w-3 h-3 fill-white" />
                        </div>
                      </div>
                    </div>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1">
                      <li>• 7 Days Replacement Policy</li>
                      <li>• GST invoice available</li>
                      {product.sellingPrice && (
                        <li>• View more sellers starting from ₹{product.sellingPrice.toLocaleString('en-IN')}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {(product.description || (typeof product.description === 'object' && (product.description.long || product.description.short))) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Description</h3>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {typeof product.description === 'string'
                      ? product.description
                      : product.description?.long || product.description?.short || ''}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Specifications</h3>
                <div className="bg-white rounded-sm overflow-x-auto">
                  <div className="space-y-0 min-w-full">
                    {product.sku && (
                      <div className="flex border-b">
                        <div className="w-1/3 sm:w-auto sm:min-w-[200px] py-3 px-3 sm:px-4 bg-gray-50 text-sm text-gray-600 font-medium">SKU</div>
                        <div className="flex-1 py-3 px-3 sm:px-4 text-sm text-gray-900">{product.sku}</div>
                      </div>
                    )}
                    {brandName && (
                      <div className="flex border-b">
                        <div className="w-1/3 sm:w-auto sm:min-w-[200px] py-3 px-3 sm:px-4 bg-gray-50 text-sm text-gray-600 font-medium">Brand</div>
                        <div className="flex-1 py-3 px-3 sm:px-4 text-sm text-gray-900">{brandName}</div>
                      </div>
                    )}
                    <div className="flex border-b">
                      <div className="w-1/3 sm:w-auto sm:min-w-[200px] py-3 px-3 sm:px-4 bg-gray-50 text-sm text-gray-600 font-medium">Category</div>
                      <div className="flex-1 py-3 px-3 sm:px-4 text-sm text-gray-900">{categoryName}</div>
                    </div>
                    {product.warrantyDetails && (
                      <div className="flex border-b">
                        <div className="w-1/3 sm:w-auto sm:min-w-[200px] py-3 px-3 sm:px-4 bg-gray-50 text-sm text-gray-600 font-medium">Warranty</div>
                        <div className="flex-1 py-3 px-3 sm:px-4 text-sm text-gray-900">{product.warrantyDetails}</div>
                      </div>
                    )}
                    {product.stockQuantity && (
                      <div className="flex border-b">
                        <div className="w-1/3 sm:w-auto sm:min-w-[200px] py-3 px-3 sm:px-4 bg-gray-50 text-sm text-gray-600 font-medium">Stock Quantity</div>
                        <div className="flex-1 py-3 px-3 sm:px-4 text-sm text-gray-900">{product.stockQuantity}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(product.rating || product.reviewCount) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Ratings & Reviews</h3>
                  <div className="border rounded-sm p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-12">
                      <div className="text-center sm:text-left">
                        <div className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2">{(product.rating || 4.0).toFixed(1)}<span className="text-xl sm:text-2xl text-gray-400">/5</span></div>
                        <div className="flex items-center justify-center sm:justify-start gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(product.rating || 4) ? 'fill-green-600 text-green-600' : 'fill-gray-300 text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">{(product.reviewCount || 1000).toLocaleString()} Ratings &<br/>{(product.reviewCount || 1000).toLocaleString()} Reviews</div>
                      </div>

                      <div className="flex-1">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <div key={rating} className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="flex items-center gap-1 w-10 sm:w-12">
                              <span className="text-xs text-gray-700">{rating}</span>
                              <Star className="w-3 h-3 fill-green-600 text-green-600" />
                            </div>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-600 rounded-full"
                                style={{ width: `${rating === 5 ? 70 : rating === 4 ? 20 : 5}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 w-10 sm:w-12 text-right">
                              {rating === 5 ? Math.round((product.reviewCount || 1000) * 0.7) : 
                               rating === 4 ? Math.round((product.reviewCount || 1000) * 0.2) : 
                               Math.round((product.reviewCount || 1000) * 0.05)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {product.productDescription && product.productDescription.length > 0 && (
            <div className="mt-8 mb-8">
              <div className="bg-white border-t border-b py-4 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Product Description</h2>
              </div>

              <div className="space-y-8">
                {(showAllDescriptions ? product.productDescription : product.productDescription.slice(0, 2)).map((section, index) => {
                  const isEven = index % 2 === 0;
                  const actualIndex = showAllDescriptions ? index : index;

                  return (
                    <div key={actualIndex} className="bg-gray-50 rounded-sm overflow-hidden">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        {isEven ? (
                          <>
                            <div className={`${section.image ? 'lg:col-span-7' : 'lg:col-span-12'} p-6 sm:p-8 lg:p-12`}>
                              {section.title && (
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                                  {section.title}
                                </h3>
                              )}
                              {section.content && (
                                <div className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {section.content}
                                </div>
                              )}
                            </div>

                            {section.image && (
                              <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-8 bg-white">
                                <img
                                  src={section.image}
                                  alt={section.title || `Section ${actualIndex + 1}`}
                                  className="w-full h-auto max-w-md object-contain rounded-sm"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {section.image && (
                              <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-8 bg-white order-2 lg:order-1">
                                <img
                                  src={section.image}
                                  alt={section.title || `Section ${actualIndex + 1}`}
                                  className="w-full h-auto max-w-md object-contain rounded-sm"
                                />
                              </div>
                            )}

                            <div className={`${section.image ? 'lg:col-span-7' : 'lg:col-span-12'} p-6 sm:p-8 lg:p-12 order-1 lg:order-2`}>
                              {section.title && (
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                                  {section.title}
                                </h3>
                              )}
                              {section.content && (
                                <div className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {section.content}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {product.productDescription.length > 2 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAllDescriptions(!showAllDescriptions)}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm text-sm transition-colors"
                  >
                    {showAllDescriptions ? 'Show Less' : `View All ${product.productDescription.length} Sections`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetail;
