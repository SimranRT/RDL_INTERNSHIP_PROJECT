<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $sql = "SELECT * FROM departments";
    $result = $conn->query($sql);
    $depts = [];
    while($row = $result->fetch_assoc()) {
        $depts[] = $row;
    }
    echo json_encode($depts);
}

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $name = $data['name'];
    $desc = $data['description'];
    $sql = "INSERT INTO departments (name, description) VALUES ('$name', '$desc')";
    $conn->query($sql);
    echo json_encode(["id" => $conn->insert_id]);
}
?>
