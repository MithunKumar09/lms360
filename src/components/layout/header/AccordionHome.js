import React from "react";
import MobileAccordion from "./MobileAccordion";

const AccordionHome = () => {
  const lightDemos = [
    {
      name: "Home (Default)",
      path: "/",
    },
  ];
  const darkDemos = [
    {
      name: "Home Default ",
      path: "/home-1-dark",
    },
  ];
  const items = [
    {
      name: "Homes Light",
      path: "/",
      accordion: true,
      items: lightDemos,
    },
    {
      name: "Homes Dark",
      path: "/home-1-dark",
      accordion: true,
      items: darkDemos,
    },
  ];
  return <MobileAccordion items={items} />;
};

export default AccordionHome;
