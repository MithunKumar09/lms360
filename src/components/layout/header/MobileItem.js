import AccordionController from "@/components/shared/accordion/AccordionController";

import MobileLink from "./MobileLink";
import Accordion from "@/components/shared/accordion/Accordion";
import AccordionContent from "@/components/shared/accordion/AccordionContent";
const MobileMenuItem = ({ item }) => {
  const { name, path, children, accordion, icon } = item;

  return !accordion ? (
    <MobileLink item={{ name, path, icon }} />
  ) : (
    <Accordion>
      <AccordionController type={"primary"}>
        <MobileLink item={{ name, path, icon }} />
      </AccordionController>
      <AccordionContent>{children && children}</AccordionContent>
    </Accordion>
  );
};

export default MobileMenuItem;
