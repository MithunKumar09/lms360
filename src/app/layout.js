//src/app/layout.js
import ErrorBoundary from "@/lib/errors/ErrorBoundary.js";
import Providers from "@/components/providers/Providers.js";
import "@/app/globals.css";
import "@/assets/css/icofont.min.css";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "Edurock - Education LMS",
  description: "Cloud-based Learning Management System trusted by 1000+",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}