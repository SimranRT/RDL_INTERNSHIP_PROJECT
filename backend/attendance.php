<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $emp_id = $_GET['employee_id'];
    $month = $_GET['month']; // Format: YYYY-MM
    
    $sql = "SELECT * FROM attendance WHERE employee_id = $emp_id AND date LIKE '$month%'";
    $result = $conn->query($sql);
    $attendance = [];
    while($row = $result->fetch_assoc()) {
        $attendance[] = $row;
    }
    echo json_encode($attendance);
}

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $emp_id = $data['employee_id'];
    $date = $data['date'];
    $type = $data['type'];
    $time = $data['time'];
    
    // Logic to update or insert
    $check = "SELECT id FROM attendance WHERE employee_id = $emp_id AND date = '$date'";
    $res = $conn->query($check);
    
    if ($res->num_rows > 0) {
        $row = $res->fetch_assoc();
        $id = $row['id'];
        $field = "";
        if ($type == 'login') $field = "login_time";
        if ($type == 'logout') $field = "logout_time";
        if ($type == 'lunch_start') $field = "lunch_start";
        if ($type == 'lunch_end') $field = "lunch_end";
        
        $sql = "UPDATE attendance SET $field = '$time' WHERE id = $id";
    } else {
        $sql = "INSERT INTO attendance (employee_id, date, login_time, status) VALUES ($emp_id, '$date', '$time', 'Present')";
    }
    
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false]);
    }
}
?>
