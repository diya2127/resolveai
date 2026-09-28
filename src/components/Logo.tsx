import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  dark?: boolean;
}

export function LogoIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      id="resolveai-logo-svg"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Underpass Diagonal: Deep navy to rich royal blue */}
        <linearGradient id="logoUnderpass" x1="38" y1="38" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B21A0" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Overpass Diagonal: Vibrant royal blue to electric sky blue */}
        <linearGradient id="logoOverpass" x1="38" y1="82" x2="82" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>

        {/* Left Loop Gradient */}
        <linearGradient id="logoLeftLoop" x1="38" y1="82" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B21A0" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>

        {/* Right Loop Gradient */}
        <linearGradient id="logoRightLoop" x1="82" y1="82" x2="82" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>

        {/* Top Loop Gradient */}
        <linearGradient id="logoTopLoop" x1="38" y1="38" x2="82" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>

        {/* Bottom Loop Gradient */}
        <linearGradient id="logoBottomLoop" x1="38" y1="82" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B21A0" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Diagonal Gloss Highlight Reflection */}
        <linearGradient id="logoGlossGrad" x1="44" y1="76" x2="76" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. Underpass Diagonal (Top-Left to Bottom-Right) */}
      <path
        id="resolveai-logo-path-underpass"
        d="M 38 38 L 82 82"
        stroke="url(#logoUnderpass)"
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* 2. Outer Loops (Left, Right, Top, Bottom) */}
      <path
        id="resolveai-logo-path-left-loop"
        d="M 38 38 C 14 38, 14 82, 38 82"
        stroke="url(#logoLeftLoop)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      <path
        id="resolveai-logo-path-right-loop"
        d="M 82 38 C 106 38, 106 82, 82 82"
        stroke="url(#logoRightLoop)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      <path
        id="resolveai-logo-path-top-loop"
        d="M 38 38 C 38 14, 82 14, 82 38"
        stroke="url(#logoTopLoop)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      <path
        id="resolveai-logo-path-bottom-loop"
        d="M 38 82 C 38 106, 82 106, 82 82"
        stroke="url(#logoBottomLoop)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      {/* 3. Overpass Foreground Diagonal (Bottom-Left to Top-Right) */}
      <path
        id="resolveai-logo-path-overpass"
        d="M 38 82 L 82 38"
        stroke="url(#logoOverpass)"
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* 4. Elegant 3D Diagonal Gloss Highlight */}
      <path
        id="resolveai-logo-path-gloss"
        d="M 44 76 L 76 44"
        stroke="url(#logoGlossGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export default function Logo({ className = "", iconOnly = false, size = "md", dark = false }: LogoProps) {
  const iconSizeClass = {
    sm: "w-5.5 h-5.5 md:w-6 md:h-6",
    md: "w-8 h-8",
    lg: "w-16 h-16",
  }[size];

  const textSizeClass = {
    sm: "text-base md:text-lg",
    md: "text-xl md:text-2xl",
    lg: "text-3xl md:text-4xl",
  }[size];

  const gapClass = {
    sm: "gap-1.5 md:gap-2",
    md: "gap-2.5",
    lg: "gap-3.5",
  }[size];

  return (
    <div id="resolveai-logo-container" className={`flex items-center ${gapClass} ${className}`}>
      <div className="shrink-0 flex items-center justify-center leading-none">
       <div style={{color: "red", fontSize: "40px"}}>
<div className="shrink-0 flex items-center justify-center leading-none">
 <img
  src="/ResolveAI_Logo_Design__1_-removebg-preview1.png"
  alt="ResolveAI Logo"
  className={iconSizeClass}
/>
</div>
</div>
      </div>
      {!iconOnly && (
        <span id="resolveai-logo-text" className={`font-display font-extrabold tracking-tight ${textSizeClass} flex items-center leading-none`}>
          <span className={dark ? "text-white" : "text-slate-900"}>Resolve</span>
          <span className="text-sky-500 font-black">AI</span>
        </span>
      )}
    </div>
  );
}
