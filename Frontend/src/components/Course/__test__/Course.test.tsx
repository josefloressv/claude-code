import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Course } from "../Course";

describe("Course Component", () => {
  const mockCourse = {
    id: 1,
    name: "React Fundamentals",
    description: "Aprende React desde cero con ejemplos prácticos.",
    thumbnail: "https://example.com/thumbnail.jpg",
    average_rating: 4.5,
    total_ratings: 42,
  };

  it("renders course information correctly", () => {
    render(<Course {...mockCourse} />);

    expect(screen.getByText(mockCourse.name)).toBeDefined();
    expect(screen.getByText(mockCourse.description)).toBeDefined();
  });

  it("renders thumbnail with correct alt text", () => {
    render(<Course {...mockCourse} />);

    const thumbnail = screen.getByRole("img", { hidden: true });
    expect(thumbnail).toHaveAttribute("src", mockCourse.thumbnail);
    expect(thumbnail).toHaveAttribute("alt", mockCourse.name);
  });

  it("renders with correct structure", () => {
    const { container } = render(<Course {...mockCourse} />);

    expect(container.querySelector("article")).toBeDefined();
    expect(container.querySelector("div > img")).toBeDefined();
    expect(container.querySelector("div > h2")).toBeDefined();
    expect(container.querySelector("div > p")).toBeDefined();
  });

  it("displays star rating when average_rating is provided", () => {
    render(<Course {...mockCourse} />);

    // StarRating renders with role="img" and an aria-label with the rating
    const ratings = screen.getAllByRole("img", { hidden: true });
    const starRating = ratings.find((el) =>
      el.getAttribute("aria-label")?.includes("out of 5 stars")
    );
    expect(starRating).toBeDefined();
  });

  it("does not display star rating when average_rating is undefined", () => {
    const { average_rating: _, ...courseWithoutRating } = mockCourse;
    render(<Course {...courseWithoutRating} />);

    const ratings = screen.queryAllByRole("img", { hidden: true });
    const starRating = ratings.find((el) =>
      el.getAttribute("aria-label")?.includes("out of 5 stars")
    );
    expect(starRating).toBeUndefined();
  });
});
