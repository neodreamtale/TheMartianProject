public static void main (String[] args){

}

class TestCase {
    private String name;
    private boolean passed;

    public TestCase(String name) {
        this.name = name;
        this.passed = false;
    }

    public void run() {
        // Simulate running the test case
        System.out.println("Running test case: " + name);
        // Here you would have logic to determine if the test passed or failed
        // For demonstration, we'll randomly set it to passed or failed
        this.passed = Math.random() > 0.5; // Randomly pass or fail
    }

    /**
     * @martian TEST_ABC
     * @return
     */
    public boolean isPassed() {
        return passed;
    }

    public String getName() {
        return name;
    }
}