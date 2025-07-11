package main

import (
	"os"
	"testing"
)

// TestAdd tests the Add function
func TestAdd(t *testing.T) {
	// Print if COPYIST_RECORD is set
	if os.Getenv("COPYIST_RECORD") != "" {
		t.Logf("COPYIST_RECORD is set to: %s", os.Getenv("COPYIST_RECORD"))
	} else {
		t.Log("COPYIST_RECORD is not set")
	}
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

	t.Run("subtest 1", func(t *testing.T) {
		// Print if COPYIST_RECORD is set
		if os.Getenv("COPYIST_RECORD") != "" {
			t.Logf("COPYIST_RECORD is set to: %s", os.Getenv("COPYIST_RECORD"))
		} else {
			t.Log("COPYIST_RECORD is not set")
		}
		if Add(1, 1) != 2 {
			t.Error("1+1 should be 2")
		}
	})

	t.Run("subtest 2", func(t *testing.T) {
		// Print if COPYIST_RECORD is set
		if os.Getenv("COPYIST_RECORD") != "" {
			t.Logf("COPYIST_RECORD is set to: %s", os.Getenv("COPYIST_RECORD"))
		} else {
			t.Log("COPYIST_RECORD is not set")
		}
		if Add(1, 1) != 2 {
			t.Error("1+1 should be 2")
		}
	})
}

// BenchmarkAdd benchmarks the Add function
func BenchmarkAdd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Add(123, 456)
	}
}
