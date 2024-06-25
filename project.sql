use hotel;

create table if not exists Guest(
	guestId int(10) auto_increment primary key,
	FirstName varchar(50),
	MiddleName varchar(50),
	LastName varchar(50),
    AadharNo numeric(12) unique,
	Email varchar(50),
	PhoneNo numeric(10) unique
);

create table if not exists Room(
    roomId int(6) primary key,
    roomType varchar(20)
);

create table if not exists Transaction(
	paymentId int(25) auto_increment primary key,
	amount numeric(10),
    guestId int(10),
	foreign key (guestId) references guest(guestId)
);


create table if not exists Reservation( 
	roomId int(6),
    paymentId int(25),
    foreign key(roomId) references room(roomId),
	foreign key (paymentId) references transaction(paymentId),	
	CheckInDate date,
	CheckOutDate date,
    roomType varchar(20)
);

create table if not exists roomfeatures(
    roomType VARCHAR(20) PRIMARY KEY,
    hasLargeBed BOOLEAN,
    hasSeatingArea BOOLEAN,
    hasWorkDesk BOOLEAN,
    hasMinibar BOOLEAN,
    hasPremiumToiletries BOOLEAN,
    hasWifi BOOLEAN,
    hasRiverView BOOLEAN,
    hasBreakfast BOOLEAN,
    hasNewspaper BOOLEAN,
    rent DECIMAL(10, 2),
    guestCapacity INT
);













