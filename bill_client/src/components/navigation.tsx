"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation: React.FC = () => {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll event to update isScrolled state, for sticky effect
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            setIsScrolled(scrollTop > 50); // Detach after scrolling 50px
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`
            fixed z-50 bg-gray-900/90 backdrop-blur-md text-white shadow-lg border border-gray-700/50 
            transition-all duration-300 ease-in-out
            ${isScrolled 
                ? 'top-3 left-3 right-3 rounded-2xl px-6 py-3' 
                : 'top-0 left-0 right-0 rounded-none px-6 py-4'
            }
        `}>
            <div className="flex items-center justify-between w-full">
                <span className="font-bold text-lg text-white">Simplify Bill</span>
                <ul className="flex space-x-6">
                    {pathname !== '/' && (
                        <li>
                            <Link href="/">
                                <span className="hover:text-blue-400 cursor-pointer text-white transition-colors px-3 py-1 rounded-full hover:bg-gray-800/50">Home</span>
                            </Link>
                        </li>
                    )}
                    <li>
                        <Link href="/about">
                            <span className="hover:text-blue-400 cursor-pointer text-white transition-colors px-3 py-1 rounded-full hover:bg-gray-800/50">About</span>
                        </Link>
                    </li>
                    {/* Add more navigation links as needed */}
                </ul>
            </div>
        </nav>
    );
};

export default Navigation;