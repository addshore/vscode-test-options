package main

import "fmt"

// Add adds two integers and returns the result
func Add(a, b int) int {
	return a + b
}

// Multiply multiplies two integers and returns the result
func Multiply(a, b int) int {
	return a * b
}

// Greet returns a greeting message
func Greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	fmt.Println(Add(2, 3))
	fmt.Println(Multiply(4, 5))
	fmt.Println(Greet("World"))
}
