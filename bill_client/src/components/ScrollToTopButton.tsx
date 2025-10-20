"use client";
import { useEffect, useState } from "react";
import { Fab } from "@mui/material";
import { KeyboardArrowUp } from "@mui/icons-material";

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Fab
      onClick={scrollToTop}
      sx={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        backgroundColor: '#3b82f6',
        color: 'white',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(100px)',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          backgroundColor: '#2563eb',
          transform: isVisible ? 'translateY(-4px) scale(1.1)' : 'translateY(100px)',
        },
        '&:active': {
          transform: isVisible ? 'translateY(-2px) scale(1.05)' : 'translateY(100px)',
        }
      }}
      size="large"
    >
      <KeyboardArrowUp />
    </Fab>
  );
};

export default ScrollToTopButton;