import { Algora } from "algora-js";

const createRectangle = (width: number, height: number) => {
  // Create a new rectangle
  const rect = {
    width,
    height,
    perimeter: width * 2 + height * 2, // calculate the perimeter of the rectangle
    area: width * height // calculate the area of the rectangle
  };

  return rect;
};

const findMissingRectangles = (inputWidth: number, inputHeight: number) => {
  const rectangles = [];

  for (let i = 1; i <= inputWidth; i++) { 
    for (let j = 1; j <= inputHeight; j++) { 
      // calculate the perimeter of each rectangle
      const rect = createRectangle(i, j);

      // add the rectangle to the list if its perimeter is greater than the total perimeter
      rectangles.push(rect);
    }
  }

  return rectangles;
};

export default findMissingRectangles;