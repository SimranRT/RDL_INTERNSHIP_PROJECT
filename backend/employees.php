<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        $sql = "SELECT * FROM employees WHERE id = $id";
    } else {
        $sql = "SELECT * FROM employees";
    }
    $result = $conn->query($sql);
    $employees = [];
    while($row = $result->fetch_assoc()) {
        $employees[] = $row;
    }
    echo json_encode($employees);
}

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $name = $data['name'];
    $username = $data['username'];
    $password = $data['password'];
    $dept_id = $data['department_id'];
    
    $sql = "INSERT INTO employees (name, username, password, department_id) VALUES ('$name', '$username', '$password', $dept_id)";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        echo json_encode(["success" => false, "error" => $conn->error]);
    }
}
?>
