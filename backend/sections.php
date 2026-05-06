<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $sql = "SELECT s.*, d.name as department_name FROM sections s JOIN departments d ON s.department_id = d.id";
    $result = $conn->query($sql);
    $sections = [];
    while($row = $result->fetch_assoc()) {
        $sections[] = $row;
    }
    echo json_encode($sections);
}

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $name = $data['name'];
    $dept_id = $data['department_id'];
    $desc = $data['description'];
    $sql = "INSERT INTO sections (name, department_id, description) VALUES ('$name', $dept_id, '$desc')";
    $conn->query($sql);
    echo json_encode(["id" => $conn->insert_id]);
}
?>
