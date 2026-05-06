<?php
require_once 'config.php';

$data = json_decode(file_get_contents("php://input"), true);
$name = $data['name'];
$username = $data['username'];
$password = $data['password'];

$sql = "INSERT INTO employees (name, username, password, role) VALUES ('$name', '$username', '$password', 'employee')";

if ($conn->query($sql)) {
    $id = $conn->insert_id;
    $sql = "SELECT * FROM employees WHERE id = $id";
    $result = $conn->query($sql);
    $user = $result->fetch_assoc();
    echo json_encode(["success" => true, "user" => $user]);
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => $conn->error]);
}
?>
