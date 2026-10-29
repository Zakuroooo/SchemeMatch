import type { Field } from "@schemematch/engine";
import type { ImageSourcePropType } from "react-native";
import type { IconName } from "./Icon";
import dbt from "../../assets/images/dbt.jpg";
import bank from "../../assets/images/bank.jpg";
import family from "../../assets/images/family.jpg";
import gas from "../../assets/images/gas.jpg";
import pension from "../../assets/images/pension.jpg";
import papers from "../../assets/images/papers.jpg";
import rationcard from "../../assets/images/rationcard.jpg";
import umbrella from "../../assets/images/umbrella.jpg";

/**
 * Object renders made on Kaggle (SDXL), palette 04 "stone" set. Objects only, never people.
 * Rule: a picture appears only where it shows what the text is about (prompts and the verdict for
 * every image: docs/design-refs/PROMPTS.md, rounds 4 and 4b).
 */
export const IMAGES = {
  dbt: dbt as ImageSourcePropType, // coins on a passbook
  bank: bank as ImageSourcePropType,
  family: family as ImageSourcePropType, // a small house
  gas: gas as ImageSourcePropType,
  pension: pension as ImageSourcePropType, // glasses on coins
  papers: papers as ImageSourcePropType,
  rationcard: rationcard as ImageSourcePropType,
  umbrella: umbrella as ImageSourcePropType, // cover over a house
};

type Picture = { image: ImageSourcePropType } | { icon: IconName };

/** The picture for a scheme category: a render where one fits, else a drawn icon. */
export function categoryPicture(category: string): Picture {
  switch (category) {
    case "pension":
      return { image: IMAGES.pension };
    case "women":
      return { image: IMAGES.dbt };
    case "savings":
    case "banking":
      return { image: IMAGES.bank };
    case "family":
    case "housing":
      return { image: IMAGES.family };
    case "household":
      return { image: IMAGES.gas };
    case "insurance":
      return { image: IMAGES.umbrella };
    case "education":
      return { icon: "cap" };
    case "farming":
      return { icon: "sprout" };
    case "maternity":
      return { icon: "heart" };
    default:
      return { icon: "tools" }; // livelihood and anything new
  }
}

/** A picture for a question, only where one shows what is asked. Most questions have none. */
export function questionPicture(field: Field): ImageSourcePropType | null {
  switch (field) {
    case "has_bpl_card":
      return IMAGES.rationcard;
    case "annual_family_income":
      return IMAGES.dbt;
    case "household_size":
    case "children_count":
      return IMAGES.family;
    default:
      return null;
  }
}
