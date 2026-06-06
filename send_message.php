<?php
$name = 'Aktaruj Jaman';

$amount = 2301;

$supportNumber = '+919999999999';

// $message =
// "Hello ".$name.",\n\n".
// "This is automated WhatsApp message.\n\n".
// "You have paid *₹".$amount.".* Thank you.\n\n".
// "📞 Call Support:\n".
// $supportNumber;

$message =
"🏫 *Railway Smart School Management Software*\n\n".

"Digitally manage your entire school with a modern, secure, and powerful school management system designed for schools, madrasas, academies, and educational institutions.\n\n".

"━━━━━━━━━━━━━━━\n\n".

"✨ *Key Features*\n\n".

"✅ Student Admission Management\n".
"✅ Fees Collection & Due Tracking\n".
"✅ Online Payment Support\n".
"✅ Marksheet & Report Card Generation\n".
"✅ Admit Card Generation\n".
"✅ Exam & Result Management\n".
"✅ Attendance Management\n".
"✅ Expense & Income Management\n".
"✅ Multiple User Access\n".
"✅ Transport Management\n".
"✅ SMS & WhatsApp Integration\n".
"✅ One Click Reports & Export\n\n".

"━━━━━━━━━━━━━━━\n\n".

"🌐 *Website / Demo*\n".
"https://www.webzinent.com/products/school-software.php\n\n".

"📞 *Contact Number*\n".
"+91 9734000019\n\n".

"━━━━━━━━━━━━━━━\n\n".

"🎁 *FREE Demo & Setup Available*\n\n".

"Please contact us today to digitize your school management system easily and professionally.";

$data = [
    'schoolId' => 1900,
    'phone'    => '919593960815',
    'message'  => $message
];

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'http://localhost:3000/send-message');
// curl_setopt($ch, CURLOPT_URL, 'https://whatsapp-production-cee4.up.railway.app/send-message');

curl_setopt($ch, CURLOPT_POST, true);

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);

curl_close($ch);

echo $response;