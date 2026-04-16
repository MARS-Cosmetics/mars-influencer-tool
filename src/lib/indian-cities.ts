/**
 * Comprehensive Indian cities grouped by state/UT.
 * Includes all state capitals, major district headquarters, and cities with
 * population over 100K (Census 2011 + recent estimates).
 *
 * ~750 cities covering every state and union territory.
 */
export const INDIAN_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Amaravati", "Visakhapatnam", "Vijayawada", "Guntur", "Nellore",
    "Kurnool", "Kadapa", "Rajahmundry", "Kakinada", "Tirupati",
    "Anantapur", "Eluru", "Ongole", "Vizianagaram", "Tenali",
    "Proddatur", "Nandyal", "Adoni", "Madanapalle", "Machilipatnam",
    "Chittoor", "Hindupur", "Srikakulam", "Bhimavaram", "Tadepalligudem",
    "Guntakal", "Dharmavaram", "Gudivada", "Narasaraopet", "Tadipatri",
    "Mangalagiri", "Chilakaluripet", "Kavali", "Chirala", "Amalapuram",
  ],
  "Arunachal Pradesh": [
    "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro",
    "Bomdila", "Along", "Tezu", "Roing", "Daporijo",
    "Changlang", "Khonsa", "Seppa", "Yingkiong", "Anini",
  ],
  "Assam": [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon",
    "Tinsukia", "Tezpur", "Bongaigaon", "Karimganj", "North Lakhimpur",
    "Diphu", "Goalpara", "Sivasagar", "Dhubri", "Nalbari",
    "Barpeta", "Mangaldoi", "Haflong", "Kokrajhar", "Golaghat",
    "Hojai", "Morigaon", "Lanka", "Hailakandi", "Mushalpur",
  ],
  "Bihar": [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia",
    "Darbhanga", "Arrah", "Bihar Sharif", "Begusarai", "Katihar",
    "Munger", "Chhapra", "Samastipur", "Hajipur", "Sasaram",
    "Dehri", "Siwan", "Motihari", "Nawada", "Bagaha",
    "Buxar", "Kishanganj", "Sitamarhi", "Jamalpur", "Jehanabad",
    "Aurangabad", "Lakhisarai", "Bettiah", "Saharsa", "Madhubani",
  ],
  "Chhattisgarh": [
    "Raipur", "Bhilai", "Bilaspur", "Korba", "Durg",
    "Rajnandgaon", "Raigarh", "Jagdalpur", "Ambikapur", "Dhamtari",
    "Mahasamund", "Chirmiri", "Kawardha", "Kanker", "Kondagaon",
    "Mungeli", "Balod", "Bemetara", "Janjgir", "Sakti",
  ],
  "Goa": [
    "Panaji", "Vasco da Gama", "Margao", "Mapusa", "Ponda",
    "Bicholim", "Cuncolim", "Curchorem", "Sanquelim", "Canacona",
    "Quepem", "Sanguem", "Pernem", "Valpoi",
  ],
  "Gujarat": [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar",
    "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Navsari",
    "Morbi", "Nadiad", "Mehsana", "Bharuch", "Porbandar",
    "Godhra", "Valsad", "Vapi", "Surendranagar", "Palanpur",
    "Gandhidham", "Bhuj", "Dahod", "Botad", "Amreli",
    "Veraval", "Patan", "Deesa", "Kalol", "Khambhat",
    "Modasa", "Jetpur", "Gondal", "Wankaner", "Dholka",
    "Mundra", "Dwarka", "Halol", "Himmatnagar", "Keshod",
  ],
  "Haryana": [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar",
    "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula",
    "Bhiwani", "Sirsa", "Bahadurgarh", "Jind", "Thanesar",
    "Kaithal", "Rewari", "Palwal", "Hansi", "Narnaul",
    "Fatehabad", "Mahendragarh", "Tohana", "Ratia", "Pehowa",
    "Hodal", "Sohna", "Manesar", "Dharuhera",
  ],
  "Himachal Pradesh": [
    "Shimla", "Mandi", "Dharamsala", "Solan", "Nahan",
    "Bilaspur", "Hamirpur", "Kullu", "Chamba", "Una",
    "Palampur", "Sundernagar", "Manali", "Baddi", "Nalagarh",
    "Kangra", "Paonta Sahib", "Parwanoo", "Keylong", "Reckong Peo",
  ],
  "Jharkhand": [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar",
    "Hazaribagh", "Giridih", "Ramgarh", "Medininagar", "Chaibasa",
    "Dumka", "Phusro", "Chirkunda", "Hussainabad", "Adityapur",
    "Chakradharpur", "Gumla", "Lohardaga", "Koderma", "Chatra",
    "Pakur", "Godda", "Sahebganj", "Latehar", "Jamtara",
  ],
  "Karnataka": [
    "Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi",
    "Kalaburagi", "Davanagere", "Ballari", "Tumakuru", "Shivamogga",
    "Raichur", "Bidar", "Hosapete", "Hassan", "Gadag",
    "Udupi", "Robertsonpet", "Chitradurga", "Mandya", "Chikkamagaluru",
    "Bagalkot", "Ramanagara", "Chamarajanagar", "Dharwad", "Chikkaballapur",
    "Haveri", "Yadgir", "Kodagu", "Karwar", "Koppal",
    "Vijayapura", "Sirsi", "Bhatkal", "Puttur", "Kolar",
  ],
  "Kerala": [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam",
    "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram",
    "Kasaragod", "Pathanamthitta", "Idukki", "Wayanad", "Ernakulam",
    "Thalassery", "Payyanur", "Perinthalmanna", "Mattannur", "Ponnani",
    "Guruvayoor", "Changanassery", "Punalur", "Nilambur", "Cherthala",
    "Kayamkulam", "Nedumangad", "Thiruvalla", "Vadakara", "Chalakudy",
  ],
  "Madhya Pradesh": [
    "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain",
    "Sagar", "Satna", "Dewas", "Rewa", "Ratlam",
    "Murwara", "Singrauli", "Burhanpur", "Khandwa", "Morena",
    "Bhind", "Chhindwara", "Guna", "Shivpuri", "Vidisha",
    "Damoh", "Mandsaur", "Khargone", "Neemuch", "Pithampur",
    "Hoshangabad", "Itarsi", "Sehore", "Betul", "Seoni",
    "Datia", "Nagda", "Dhar", "Tikamgarh", "Shahdol",
  ],
  "Maharashtra": [
    "Mumbai", "Pune", "Nagpur", "Thane", "Nashik",
    "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Navi Mumbai",
    "Sangli", "Jalgaon", "Akola", "Latur", "Dhule",
    "Ahmednagar", "Chandrapur", "Parbhani", "Ichalkaranji", "Jalna",
    "Nanded", "Satara", "Beed", "Yavatmal", "Osmanabad",
    "Ratnagiri", "Wardha", "Gondia", "Washim", "Hingoli",
    "Buldhana", "Sindhudurg", "Gadchiroli", "Kalyan", "Dombivli",
    "Vasai-Virar", "Bhiwandi", "Panvel", "Ulhasnagar", "Mira-Bhayandar",
    "Malegaon", "Nandurbar", "Shirdi", "Palghar", "Lonavala",
  ],
  "Manipur": [
    "Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching",
    "Ukhrul", "Senapati", "Tamenglong", "Chandel", "Jiribam",
    "Moreh", "Moirang", "Nambol",
  ],
  "Meghalaya": [
    "Shillong", "Tura", "Jowai", "Nongstoin", "Williamnagar",
    "Baghmara", "Resubelpara", "Mairang", "Nongpoh", "Cherrapunji",
  ],
  "Mizoram": [
    "Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib",
    "Saiha", "Lawngtlai", "Mamit", "Saitual", "Hnahthial",
  ],
  "Nagaland": [
    "Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha",
    "Zunheboto", "Mon", "Phek", "Longleng", "Peren",
    "Kiphire", "Chumoukedima",
  ],
  "Odisha": [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur",
    "Puri", "Balasore", "Baripada", "Bhadrak", "Jharsuguda",
    "Jeypore", "Bargarh", "Koraput", "Angul", "Dhenkanal",
    "Kendrapara", "Jajpur", "Rayagada", "Paradip", "Phulbani",
    "Balangir", "Bhawanipatna", "Sundargarh", "Kendujhar", "Nowrangapur",
  ],
  "Punjab": [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda",
    "Mohali", "Hoshiarpur", "Pathankot", "Moga", "Batala",
    "Abohar", "Malerkotla", "Khanna", "Phagwara", "Muktsar",
    "Barnala", "Rajpura", "Firozpur", "Kapurthala", "Faridkot",
    "Sangrur", "Fazilka", "Gurdaspur", "Zirakpur", "Mansa",
    "Ropar", "Nawanshahr", "Dera Bassi",
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer",
    "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sri Ganganagar",
    "Sikar", "Pali", "Tonk", "Beawar", "Hanumangarh",
    "Kishangarh", "Nagaur", "Makrana", "Sujangarh", "Churu",
    "Jhunjhunu", "Bundi", "Chittorgarh", "Sawai Madhopur", "Barmer",
    "Jhalawar", "Dungarpur", "Banswara", "Rajsamand", "Sirohi",
    "Dholpur", "Baran", "Pratapgarh", "Karauli", "Jaisalmer",
    "Mount Abu", "Pushkar", "Nathdwara", "Neemrana",
  ],
  "Sikkim": [
    "Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo",
    "Singtam", "Jorethang", "Ravangla",
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
    "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi",
    "Dindigul", "Thanjavur", "Ranipet", "Sivakasi", "Karur",
    "Nagercoil", "Kanchipuram", "Hosur", "Kumbakonam", "Rajapalayam",
    "Cuddalore", "Ambur", "Pudukkottai", "Vaniyambadi", "Pollachi",
    "Nagapattinam", "Viluppuram", "Arakkonam", "Perambalur", "Dharmapuri",
    "Krishnagiri", "Nilgiris", "Namakkal", "Ariyalur", "Virudhunagar",
    "Theni", "Tenkasi", "Chengalpattu", "Tiruvallur", "Kanyakumari",
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam",
    "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet",
    "Siddipet", "Mancherial", "Miryalaguda", "Jagtial", "Kamareddy",
    "Nirmal", "Bodhan", "Sangareddy", "Medak", "Wanaparthy",
    "Gadwal", "Vikarabad", "Medchal", "Bhongir", "Jangaon",
    "Nagarkurnool", "Koilkonda", "Zaheerabad",
  ],
  "Tripura": [
    "Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia",
    "Ambassa", "Khowai", "Sabroom", "Sonamura", "Kamalpur",
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi",
    "Meerut", "Prayagraj", "Bareilly", "Aligarh", "Moradabad",
    "Saharanpur", "Gorakhpur", "Noida", "Firozabad", "Jhansi",
    "Muzaffarnagar", "Mathura", "Rampur", "Shahjahanpur", "Farrukhabad",
    "Maunath Bhanjan", "Hapur", "Etawah", "Mirzapur", "Bulandshahr",
    "Sambhal", "Amroha", "Hardoi", "Fatehpur", "Raebareli",
    "Orai", "Sitapur", "Bahraich", "Modinagar", "Unnao",
    "Jaunpur", "Lakhimpur Kheri", "Banda", "Hathras", "Lalitpur",
    "Sultanpur", "Azamgarh", "Basti", "Deoria", "Ballia",
    "Greater Noida", "Ayodhya", "Gonda", "Mainpuri", "Etah",
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur",
    "Kashipur", "Rishikesh", "Kotdwar", "Pithoragarh", "Ramnagar",
    "Mussoorie", "Nainital", "Almora", "Srinagar", "Pauri",
    "Chamoli", "Uttarkashi", "Bageshwar", "Champawat", "Tehri",
    "Jaspur", "Manglaur", "Sitarganj", "Khatima",
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri",
    "Bardhaman", "Malda", "Baharampur", "Habra", "Kharagpur",
    "Shantipur", "Barasat", "Raiganj", "Haldia", "Krishnanagar",
    "Nabadwip", "Medinipur", "Jalpaiguri", "Balurghat", "Basirhat",
    "Bankura", "Cooch Behar", "Darjeeling", "Alipurduar", "Purulia",
    "Jangipur", "Bolpur", "Bangaon", "Tamluk", "Contai",
    "Ranaghat", "Kalyani", "Barrackpore", "Serampore", "Rishra",
  ],
  // Union Territories
  "Delhi": [
    "New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi",
    "West Delhi", "Dwarka", "Rohini", "Saket", "Janakpuri",
    "Lajpat Nagar", "Karol Bagh", "Connaught Place", "Pitampura", "Shahdara",
    "Narela", "Najafgarh", "Mehrauli",
  ],
  "Jammu and Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore",
    "Kathua", "Udhampur", "Pulwama", "Rajouri", "Poonch",
    "Kupwara", "Kulgam", "Budgam", "Shopian", "Ganderbal",
    "Bandipora", "Kishtwar", "Doda", "Ramban", "Reasi",
    "Samba",
  ],
  "Ladakh": [
    "Leh", "Kargil", "Diskit", "Padum",
  ],
  "Puducherry": [
    "Puducherry", "Karaikal", "Mahe", "Yanam", "Ozhukarai",
  ],
  "Chandigarh": [
    "Chandigarh",
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Silvassa", "Daman", "Diu", "Amli", "Naroli",
  ],
  "Lakshadweep": [
    "Kavaratti", "Agatti", "Minicoy", "Amini", "Andrott",
  ],
  "Andaman and Nicobar Islands": [
    "Port Blair", "Diglipur", "Rangat", "Mayabunder", "Car Nicobar",
    "Havelock Island", "Neil Island", "Wandoor",
  ],
};

/**
 * Get cities for a given state. Returns empty array if state not found.
 */
export function getCitiesForState(state: string): string[] {
  return INDIAN_CITIES[state] || [];
}

/**
 * Get all cities across all states (flattened), each with state label.
 * Useful for a global city search.
 */
export function getAllCitiesWithState(): { city: string; state: string }[] {
  const result: { city: string; state: string }[] = [];
  for (const [state, cities] of Object.entries(INDIAN_CITIES)) {
    for (const city of cities) {
      result.push({ city, state });
    }
  }
  return result;
}
