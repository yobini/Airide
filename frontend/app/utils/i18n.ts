import I18n from 'react-native-i18n';

const en = {
  "welcome": {
    "title": "Welcome to RideApp",
    "subtitle": "Your reliable ride partner",
    "selectLanguage": "Select Language",
    "continue": "Continue"
  },
  "auth": {
    "phoneNumber": "Phone Number",
    "enterPhone": "Enter your phone number",
    "sendCode": "Send Code",
    "verifyCode": "Verify Code",
    "enterCode": "Enter verification code",
    "verify": "Verify",
    "resendCode": "Resend Code"
  },
  "userType": {
    "selectType": "How will you use RideApp?",
    "rider": "Rider",
    "driver": "Driver",
    "riderDesc": "Book rides and travel",
    "driverDesc": "Drive and earn money"
  },
  "rider": {
    "whereToGo": "Where do you want to go?",
    "searchDestination": "Search destination",
    "bookRide": "Book Ride",
    "yourLocation": "Your Location",
    "selectPickup": "Select Pickup Location",
    "findingDriver": "Finding Driver...",
    "driverFound": "Driver Found!",
    "driverArriving": "Driver is arriving",
    "onTheWay": "On the way to destination",
    "rideCompleted": "Ride Completed"
  },
  "driver": {
    "goOnline": "Go Online",
    "goOffline": "Go Offline",
    "waitingForRides": "Waiting for ride requests...",
    "newRideRequest": "New Ride Request",
    "accept": "Accept",
    "decline": "Decline",
    "pickupPassenger": "Pickup Passenger",
    "startTrip": "Start Trip",
    "endTrip": "End Trip",
    "earnings": "Today's Earnings"
  },
  "common": {
    "cancel": "Cancel",
    "ok": "OK",
    "back": "Back",
    "next": "Next",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "retry": "Retry",
    "profile": "Profile",
    "settings": "Settings",
    "logout": "Logout",
    "rating": "Rating",
    "rateDriver": "Rate Driver",
    "rateRider": "Rate Rider",
    "submit": "Submit",
    "fare": "Fare ($)",
    "distance": "Distance",
    "duration": "Duration"
  }
};

const am = {
  "welcome": {
    "title": "እንኳን ወደ ራይድአፕ መጡ",
    "subtitle": "የእርስዎ የታመነ የመጓጓዣ አጋር",
    "selectLanguage": "ቋንቋ ይምረጡ",
    "continue": "ቀጥል"
  },
  "auth": {
    "phoneNumber": "ስልክ ቁጥር",
    "enterPhone": "ስልክ ቁጥርዎን ያስገቡ",
    "sendCode": "ኮድ ላክ",
    "verifyCode": "ኮድ አረጋግጥ",
    "enterCode": "የማረጋገጫ ኮድ ያስገቡ",
    "verify": "አረጋግጥ",
    "resendCode": "ኮድ እንደገና ላክ"
  },
  "userType": {
    "selectType": "ራይድአፕን እንዴት ይጠቀማሉ?",
    "rider": "ተሳፋሪ",
    "driver": "ሹፌር",
    "riderDesc": "ጉዞ ይቦኩ እና ይጓዙ",
    "driverDesc": "ይንዱ እና ገንዘብ ያግኙ"
  },
  "rider": {
    "whereToGo": "የት መሄድ ይፈልጋሉ?",
    "searchDestination": "መድረሻ ይፈልጉ",
    "bookRide": "ጉዞ ይቦኩ",
    "yourLocation": "የእርስዎ አካባቢ",
    "selectPickup": "የመውሰጃ ቦታ ይምረጡ",
    "findingDriver": "ሹፌር እየተፈለገ...",
    "driverFound": "ሹፌር ተገኝቷል!",
    "driverArriving": "ሹፌር እየመጣ ነው",
    "onTheWay": "ወደ መድረሻ በመንገድ ላይ",
    "rideCompleted": "ጉዞ ተጠናቋል"
  },
  "driver": {
    "goOnline": "መስመር ላይ ውጣ",
    "goOffline": "መስመር ላይ ውረድ",
    "waitingForRides": "የጉዞ ጥያቄዎችን እየጠበቅኩ...",
    "newRideRequest": "አዲስ የጉዞ ጥያቄ",
    "accept": "ተቀበል",
    "decline": "ውድቅ አድርግ",
    "pickupPassenger": "ተሳፋሪ ውሰድ",
    "startTrip": "ጉዞ ጀምር",
    "endTrip": "ጉዞ ጨርስ",
    "earnings": "የዛሬ ገቢ"
  },
  "common": {
    "cancel": "ሰርዝ",
    "ok": "እሺ",
    "back": "ወደ ኋላ",
    "next": "ቀጣይ",
    "loading": "እየጫን...",
    "error": "ስህተት",
    "success": "ተሳክቷል",
    "retry": "እንደገና ሞክር",
    "profile": "መገለጫ",
    "settings": "ቅንብሮች",
    "logout": "ውጣ",
    "rating": "ደረጃ",
    "rateDriver": "ሹፌርን ደረጃ ስጥ",
    "rateRider": "ተሳፋሪን ደረጃ ስጥ",
    "submit": "አስገባ",
    "fare": "ክፍያ",
    "distance": "ርቀት",
    "duration": "ጊዜ"
  }
};

I18n.fallbacks = true;
I18n.translations = {
  en,
  am,
};

export default I18n;