package main

import "testing"

// TestAdd tests the Add function
func TestAdd(t *testing.T) {
	tests := []struct {
		name     string
		a, b     int
		expected int
	}{
		{"positive numbers", 2, 3, 5},
		{"with zero", 5, 0, 5},
		{"negative numbers", -2, -3, -5},
		{"mixed signs", -2, 3, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Add(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
			}
		})
	}
}

// TestMultiply tests the Multiply function
func TestMultiply(t *testing.T) {
	tests := []struct {
		name     string
		a, b     int
		expected int
	}{
		{"positive numbers", 3, 4, 12},
		{"with zero", 5, 0, 0},
		{"negative numbers", -2, -3, 6},
		{"mixed signs", -2, 3, -6},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Multiply(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("Multiply(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
			}
		})
	}
}

// TestGreet tests the Greet function
func TestGreet(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"simple name", "Alice", "Hello, Alice!"},
		{"empty string", "", "Hello, !"},
		{"name with spaces", "John Doe", "Hello, John Doe!"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Greet(tt.input)
			if result != tt.expected {
				t.Errorf("Greet(%q) = %q; want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// BenchmarkAdd benchmarks the Add function
func BenchmarkAdd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Add(123, 456)
	}
}

// BenchmarkMultiply benchmarks the Multiply function
func BenchmarkMultiply(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Multiply(123, 456)
	}
}
