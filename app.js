import mysql from "mysql2";
import PromptSync from "prompt-sync";

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "kp@15jp@78ap@79",
  database: "hotel",
});

const prompt = PromptSync();
const promiseConnection = connection.promise();

connection.connect(async (err) => {
  if (err) {
    console.error("Error Connecting to Server:" + err.stack);
  } else {
    console.log("Connected to the Server as Id:" + connection.threadId);
  }
});

let availableRooms=[];
let roomTypesInbudget= [];
let roomType,numOfRoomsNeeded,checkInDate,checkOutDate,nights,guestId,paymentId;

function promptForBudget() {
  console.log("Please select your budget range:");
  console.log("1. Rs. 8000");
  console.log("2. Rs. 12000");
  console.log("3. Rs. 16000");
  console.log("4. Rs. 20000");

  const budgetChoice = prompt("Enter your budget choice (1-4): ");
  console.log("------------------------------");
  const budget = getBudgetFromChoice(budgetChoice);

  if (budget != null){
    fetchRoomTypes(budget);
    return;
  } else {
    console.log("Invalid choice. Please select a number from 1 to 4.");
    console.log("------------------------------");
    promptForBudget();
  }
}

function getBudgetFromChoice(choice) {
  switch (choice) {
    case "1":
      return 8000;
    case "2":
      return 12000;
    case "3":
      return 16000;
    case "4":
      return 20000;
    default:
      return null;
  }
}

async function checkRoomAvailability(
  roomType,
  numOfRoomsNeeded,
  checkInDate,
  checkOutDate
) { 
  try {

    const [rows] = await promiseConnection.execute(
        `SELECT roomId FROM room WHERE roomType = ? AND roomId NOT IN (
            SELECT roomId FROM reservation
            WHERE (CheckInDate <= ? AND CheckOutDate >= ? AND roomType=?)
        ) LIMIT ?`,
        [roomType, checkOutDate, checkInDate, roomType,numOfRoomsNeeded]
    );
    return rows.length == numOfRoomsNeeded ? rows : null ;
} catch(error){
    console.log(error);
    return null;
}
}

async function makePayment(numOfRoomsNeeded,roomType,guestId,nights){
  try{
    console.log("Make a payment to book rooms.");
    console.log("------------------------------");
    const [rows]=await promiseConnection.execute(`select rent from roomfeatures where roomType=?`,[roomType]);
    const totalAmount=numOfRoomsNeeded*(rows[0].rent)*nights;

    console.log(`- Room Type : ${roomType}`);
    console.log(`- Number of rooms : ${numOfRoomsNeeded}`);
    console.log(`- Total payable amount : ${totalAmount}`);

    const [result]=await promiseConnection.execute(`insert into transaction (amount,guestId) values(?,?)`,[totalAmount,guestId]);
    console.log(`- Payment successfull : Transaction id : ${result.insertId}`);
    paymentId=result.insertId;
    await reserveRooms(availableRooms,paymentId,checkInDate,checkOutDate,roomType);
  }
  catch{
    console.log("Payment failed .Please try again .");
    console.log("------------------------------");
    return;
  }
}

async function reserveRooms(roomIds,paymentId,checkInDate,checkOutDate,roomType){
  try{
    let roomsBooked=[];
    for(let i=0;i<roomIds.length;i++){
      const [rows]=await promiseConnection.execute(`insert into reservation values (?,?,?,?,?)`,[roomIds[i].roomId,paymentId,checkInDate,checkOutDate,roomType]);
      roomsBooked.push(roomIds[i].roomId);
    }
    console.log(`Congratulations !! rooms booked between ${checkInDate} and ${checkOutDate}.`);
    console.log("------------------------------")
    await createInvoice(guestId, paymentId, roomsBooked, checkInDate, checkOutDate, roomType, numOfRoomsNeeded, nights);
    return;
  }
  catch{
    console.log(`Sorry ! Rooms have not booked due to server error .`);
    console.log("------------------------------")
    return;
  }
}

async function createInvoice(guestId, paymentId, roomIds, checkInDate, checkOutDate, roomType, numOfRoomsNeeded, nights) {
  try {
    
    const [guestDetails] = await promiseConnection.execute(
      `SELECT * FROM guest WHERE guestId = ?`,
      [guestId]
    );

   
    const [paymentDetails] = await promiseConnection.execute(
      `SELECT * FROM transaction WHERE paymentId = ?`,
      [paymentId]
    );

    
    const roomDetails = [];
    for (const roomId of roomIds) {
      const [room] = await promiseConnection.execute(
        `SELECT * FROM reservation WHERE roomId = ?`,
        [roomId]
      ); 
      roomDetails.push(room[0]);
    }

    console.log("------------------------------");
    console.log("Invoice");
    console.log("------------------------------");
    console.log("Guest Details:");
    console.log("------------------------------");
    console.log("Name:", guestDetails[0].FirstName, guestDetails[0].MiddleName, guestDetails[0].LastName);
    console.log("Aadhar Number:", guestDetails[0].AadharNo);
    console.log("Email:", guestDetails[0].Email);
    console.log("Phone Number:", guestDetails[0].PhoneNo);
    console.log("------------------------------");
    console.log("Payment Details:");
    console.log("------------------------------");
    console.log("Transaction ID:", paymentDetails[0].paymentId);
    console.log("Amount Paid:", paymentDetails[0].amount);
    console.log("------------------------------");
    console.log("Rooms Allocated:");
    console.log("------------------------------");
    roomDetails.forEach((room, index) => {
      console.log(`Room ${index + 1}:`);
      console.log("Room ID:", room.roomId);
      console.log("Room Type:", roomType);
    });
    console.log("------------------------------");
    console.log("Booking Dates:");
    console.log("------------------------------");
    console.log("Check-in Date:", checkInDate);
    console.log("Check-out Date:", checkOutDate);
    console.log("Number of Nights:", nights);
    console.log("------------------------------");
  } catch (error) {
    console.error("Error creating invoice:", error);
  }
}


async function selectRoomType(roomTypesInbudget) {
  console.log("------------------------------")
  console.log("Select Room type : ");
  roomTypesInbudget.forEach((row, index) => {
    console.log(`${index + 1} : ${row.roomType}`);
  });
  console.log("------------------------------");

  const choice = prompt(
    "Select a number corresponding to your preferred room type : "
  );

  console.log("------------------------------");
  if(choice>=1 && choice<=(roomTypesInbudget.length)){
    
    roomType=roomTypesInbudget[choice-1].roomType;
    numOfRoomsNeeded = prompt("Enter number of rooms required : ");
    checkInDate = prompt("Enter check in date (YYYY-MM-DD) : ");
    checkOutDate = prompt("Enter check out date (YYYY-MM-DD) : ");
    nights=Math.floor((new Date(checkOutDate)-new Date(checkInDate))/(1000*3600*24));
    console.log("------------------------------")

    availableRooms=await checkRoomAvailability(roomType,numOfRoomsNeeded,checkInDate,checkOutDate);

    if(availableRooms!=null) await getUserDetails();

    else{
      console.log("Rooms will not be available on these dated of your selected room type ; please select another room type .");
      console.log("------------------------------");
      selectRoomType(roomTypesInbudget);
    }
  }

  else{
    console.log("Invalid choice . Please choose from available room types.");
    console.log("------------------------------");
    selectRoomType(roomTypesInbudget);
  }
}

async function getUserDetails() {
  console.log("------------------------------");
  console.log("Enter your details ");
  const FirstName = prompt("Enter your first name : ");
  const MiddleName = prompt("Enter your Middle name : ");
  const LastName = prompt("Enter your last name : ");
  let AadharNo;
  do {
    AadharNo = prompt("Enter your Aadhar Number (must be of 12 digits): ");
    if (!/^\d{12}$/.test(AadharNo)) {
      console.log(
        "Aadhar Number must be exactly 12 digits long. Please try again."
      );
    }
  } while (!/^\d{12}$/.test(AadharNo));

  let Email;
  do {
    Email = prompt("Enter your email address: ");
    if (!/\S+@\S+\.\S+/.test(Email)) {
      console.log("Invalid email format. Please try again.");
    }
  } while (!/\S+@\S+\.\S+/.test(Email));

  let PhoneNo;
  do {
    PhoneNo = prompt("Enter your phone number (must be of 10 digits): ");
    if (!/^\d{10}$/.test(PhoneNo)) {
      console.log(
        "Phone number must be exactly 10 digits long. Please try again."
      );
    }
  } while (!/^\d{10}$/.test(PhoneNo));

  try{
    const [rows]= await promiseConnection.execute(
      `INSERT INTO guest (FirstName, MiddleName, LastName, AadharNo, Email, PhoneNo) VALUES (?, ?, ?, ?, ?, ?)`,
      [FirstName, MiddleName, LastName, AadharNo, Email, PhoneNo]);

      if(rows.affectedRows>0){
        guestId=rows.insertId;
        console.log("Your details added successfuly.");
        console.log("------------------------------");
        await makePayment(numOfRoomsNeeded,roomType,guestId,nights);
        return;
      }
  }
  catch{
      console.error("Error inserting your details .");
      console.log("------------------------------");
      return null;
  }
}

async function fetchRoomTypes(budget) {
  try {
    const [rows] = await promiseConnection.execute(
      `SELECT roomType, rent, guestCapacity, hasLargeBed, hasSeatingArea, hasWorkDesk, hasMinibar, hasPremiumToiletries,hasWifi,hasRiverView,hasBreakfast,hasNewspaper FROM roomfeatures WHERE rent <= ?`,
      [budget]
    );

    console.log("Rooms that best suit your budget:");
    console.log("------------------------------");
    rows.forEach((row, index) => {
      console.log(index + 1);
      console.log(`Room Type : ${row.roomType}`);
      console.log(`Rent : ${row.rent} INR/Night`);
      console.log(`Guest Capacity : ${row.guestCapacity}`);
      console.log(`Features :`);
      console.log("- Large Bed:", row.hasLargeBed ? "Yes" : "No");
      console.log("- Seating Area:", row.hasSeatingArea ? "Yes" : "No");
      console.log("- Work Desk:", row.hasWorkDesk ? "Yes" : "No");
      console.log("- Minibar:", row.hasMinibar ? "Yes" : "No");
      console.log(
        "- Premium Toiletries:",
        row.hasPremiumToiletries ? "Yes" : "No"
      );
      console.log("- Minibar:", row.hasWifi ? "Yes" : "No");
      console.log("- River View:", row.hasRiverView ? "Yes" : "No");
      console.log("- Breakfast:", row.hasBreakfast ? "Yes" : "No");
      console.log("- Newspaper:", row.hasNewspaper ? "Yes" : "No");
      console.log("------------------------------");
    });

    if (rows.length == 0) {
      console.log("No rooms available in your budget");
      promptForBudget();
    }

    roomTypesInbudget = rows;
    selectRoomType(roomTypesInbudget);
    return;
  } catch (error) {
    promptForBudget();
  }
}

promptForBudget();

