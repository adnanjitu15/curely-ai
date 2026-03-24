"use client";

import Spline from '@splinetool/react-spline';
import { motion } from "framer-motion";
import { useState } from "react";

export default function MewowBot() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      className="relative w-full h-[900px] flex items-start justify-end pr-0 overflow-visible pointer-events-none mt-[-50px]" 
    >
      {/* POSITIONING RESTORED FROM YOUR CODE:
        - Width 140% 
        - translate-x-[15%] 
        - This aligns him to the right and gives him space.
      */}
      <div className="relative w-[140%] h-full flex items-center justify-center translate-x-[15%] pointer-events-auto overflow-visible">
        
        {/* THE 3D BOT - Massive Canvas settings from your code */}
        <motion.div 
          className="absolute inset-0 z-10 w-[150%] h-[110%] left-[-25%] top-[-5%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 1 }}
        >
          <Spline 
            scene="https://prod.spline.design/2FSmYjL8yOP8Ieuw/scene.splinecode"
            onLoad={() => setIsLoaded(true)}
          /> 
        </motion.div>

        {/* REMOVED: Eva Eyes
           REMOVED: Brain
           RESULT: Just the clean, perfect 3D bot.
        */}
        
      </div>
    </div>
  );
}