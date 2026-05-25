#!/usr/bin/env python3
"""
Simple Python example script.

This module demonstrates basic Python concepts including:
- Functions
- Classes
- List comprehension
- Dictionary usage
"""

def greet(name: str) -> str:
    """
    Greet a person by name.
    
    Args:
        name: The person's name
        
    Returns:
        A greeting string
    """
    return f"Hello, {name}!"


class Person:
    """Represents a person with name and age."""
    
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def __str__(self) -> str:
        return f"{self.name} ({self.age} years old)"
    
    def is_adult(self) -> bool:
        """Check if person is an adult."""
        return self.age >= 18


def main():
    """Main function."""
    # Create person instances
    people = [
        Person("Alice", 30),
        Person("Bob", 25),
        Person("Charlie", 17)
    ]
    
    # Print information
    for person in people:
        status = "Adult" if person.is_adult() else "Minor"
        print(f"{person} - {status}")
    
    # List comprehension
    adults = [p for p in people if p.is_adult()]
    print(f"\nTotal adults: {len(adults)}")


if __name__ == "__main__":
    main()
