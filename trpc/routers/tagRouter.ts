import z from "zod";

export const tagColorSchema = z.enum([
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
]);