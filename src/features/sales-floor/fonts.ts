import { Oswald, Patrick_Hand, Permanent_Marker } from "next/font/google";

/** Brush lettering for the title and team names. */
export const markerFont = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker" });

/** Chalk-style handwriting for names and numbers in the tables. */
export const chalkFont = Patrick_Hand({ weight: "400", subsets: ["latin"], variable: "--font-chalk" });

/** Condensed caps for column headers and taglines. */
export const condensedFont = Oswald({ subsets: ["latin"], variable: "--font-condensed" });

export const salesFloorFontVariables = `${markerFont.variable} ${chalkFont.variable} ${condensedFont.variable}`;
