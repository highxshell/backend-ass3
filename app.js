const express = require("express");
const axios = require("axios");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const WeatherData = require("./models/WeatherData");
const UserData = require("./models/UserData");
const AirData = require("./models/AirData");
import("node-fetch");

const app = express();
const port = 3000;

mongoose
  .connect(
    "mongodb+srv://artempopov:mongodb123@cluster0.rbt8icq.mongodb.net/?retryWrites=true&w=majority",
    {}
  )
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas:", err.message);
  });
app.use(express.urlencoded({ extended: true }));
app.use(express.static("views"));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

const apiKey = "ace1ffcc9ac4cab7456a6d14fdc483e7";
const nasaApodApiKey = "Rreq2D2tsHmKYfBdxoeEa5m48d1Fc15YUIgFfXOu";

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    const hash = await bcrypt.hash(password, 10);
    if (!user || !bcrypt.compare(hash, user.password)) {
      return res
        .status(401)
        .render("login", { error: "Invalid username or password" });
    }
    req.session.user = user;
    res.redirect("/map?city=Astana");
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).render("error");
  }
});
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    req.session.user = newUser;
    res.render("login");
  } catch (error) {
    console.error("Error during sign up:", error.message);
    res.status(500).render("error");
  }
});

app.get("/main", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.render("main", { user: req.session.user });
});

app.get("/apod", async (req, res) => {
  try {
    const userDataEntry = new UserData({
      username: req.session.user.username,
      accessHistory: Date.now(),
    });
    await userDataEntry.save();
    const apodResponse = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${nasaApodApiKey}`
    );
    const apodData = await apodResponse.json();
    res.render("apod", { apodData: apodData });
  } catch (error) {
    console.error("Error fetching APOD data:", error);
    res.render("apod", { apodData: null });
  }
});

app.get("/country/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const countryResponse = await axios.get(
      `https://restcountries.com/v3/alpha/${code}`
    );
    const countryData = countryResponse.data[0];
    res.json(countryData);
  } catch (error) {
    console.error("Error fetching country data", error);
    res.status(500).send("Error fetching country data");
  }
});

app.get("/map", async (req, res) => {
  const cityName = req.query.city;

  if (!cityName) {
    return res.send(
      "Please provide a city parameter in the URL, e.g., /map?city=London"
    );
  }

  const apiUrl = `http://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    const weatherData = response.data;

    const cityData = {
      name: cityName,
      temperature: weatherData.main.temp - 273.15,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      coordinates: {
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon,
      },
      feelsLike: weatherData.main.feels_like - 273.15,
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure,
      windSpeed: weatherData.wind.speed,
      country: weatherData.sys.country,
      rainVolumeLast3Hours: weatherData.hasOwnProperty("rain")
        ? weatherData.rain["3h"] || 0
        : 0,
    };
    const weatherDataEntry = new WeatherData({
      username: req.session.user.username,
      city: cityName,
      temperature: (weatherData.main.temp - 273.15).toFixed(0),
      description: weatherData.weather[0].description,
      createdAt: Date.now(),
    });
    await weatherDataEntry.save();

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>City Map</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
          <link
          href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
          rel="stylesheet"
        />
          <style>
          /* Additional Custom Styles */
          body {
            padding-top: 56px; /* Height of fixed navbar */
            margin-bottom: 60px; /* Height of fixed footer */
          }
          h5 {
            color: white;
          }
          #apod-image {
            height: 400px;
          }
          #map {
            height: 400px;
          }
          /* Custom styles for small screens */
          @media (max-width: 576px) {
            body {
              padding-top: 0;
            }
          }
          /* Custom Footer Styles */
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            background-color: #f8f9fa;
            text-align: center;
            padding: 10px;
          }
        </style>
        </head>
        <body>
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div class="container">
          <a class="navbar-brand" href="/">Login</a>
          
          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarResponsive">
            <ul class="navbar-nav ml-auto">
              <li class="nav-item">
                <a class="nav-link" href="/map?city=Astana">Weather Map</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/airquality?city=Astana">Air Quality API</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/apod">NASA APOD API</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/weather/history" target="_blank">Your History</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
          <div class="container mt-4 ">
          <!-- City Map Content -->
          <h1 class="mb-4">City Map - ${cityData.name} for you ${
      req.session.user.username
    }</h1>
          
          <!-- Search Form -->
    <form id="searchForm" class="mb-3">
      <div class="input-group">
        <input type="text" class="form-control" id="cityInput" placeholder="Enter a city name">
        <div class="input-group-append">
          <button class="btn btn-primary" type="submit">Search</button>
        </div>
      </div>
    </form>
    <h2>Country Information</h2>
      <p id="country-name"></p>
      <p id="country-capital"></p>
      <p id="country-population"></p>
          <div id="map"></div>
        </div>
        <div class="container mt-4">
        
      
        <footer class="footer mt-5 bg-white">
      <div class="container">
        <p>Popov Artem | SE-2205</p>
      </div>
    </footer>
        <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.3/dist/umd/popper.min.js"></script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"></script>
          <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
          <script>
            const city = ${JSON.stringify(cityData)};
            
            const map = L.map('map').setView([city.coordinates.lat, city.coordinates.lon], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            const marker = L.marker([city.coordinates.lat, city.coordinates.lon]).addTo(map);
            marker.bindPopup(\`
              <b>\${city.name}</b><br>
              Temperature: \${city.temperature.toFixed(0)}°C<br>
              Description: \${city.description}<br>
              Icon: <img src="http://openweathermap.org/img/wn/\${city.icon}.png"><br>
              Coordinates: Lat \${city.coordinates.lat}, Lon \${city.coordinates.lon}<br>
              Feels Like: \${city.feelsLike.toFixed(0)}°C<br>
              Humidity: \${city.humidity}%<br>
              Pressure: \${city.pressure} hPa<br>
              Wind Speed: \${city.windSpeed} m/s<br>
              Country Code: \${city.country}<br>
              Rain Volume (last 3 hours): \${city.rainVolumeLast3Hours} mm
            \`).openPopup();
            // JavaScript Code for City Search
            document.getElementById('searchForm').addEventListener('submit', function(event) {
              event.preventDefault();
              const cityInput = document.getElementById('cityInput').value.trim();
              if (cityInput !== '') {
                const encodedCity = encodeURIComponent(cityInput);
                const mapUrl = "/map?city=" + encodedCity;
                window.open(mapUrl, "_self");
              }
            });
      
            // Function to fetch Country information
            async function getCountryData(countryCode) {
              try {
                const response = await fetch("/country/" + countryCode);
                const data = await response.json();
      
                // Update the HTML with country information
                document.getElementById(
                  "country-name"
                ).innerText = "Name: " + data.name.common;
                document.getElementById(
                  "country-capital"
                ).innerText = "Capital: " + data.capital;
                document.getElementById(
                  "country-population"
                ).innerText = "Population: " + data.population;
              } catch (error) {
                console.error("Error fetching country data", error);
              }
            }
    
            getCountryData(city.country);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`Error fetching weather data for ${cityName}: ${error.message}`);
  }
});

app.get("/airquality", async (req, res) => {
  const cityName = req.query.city; // Extract city parameter from URL
  if (!cityName) {
    return res.send(
      "Please provide a city parameter in the URL, e.g., /map?city=London"
    );
  }
  const apiUrl = `http://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    const weatherData = response.data;
    const responseAir = await axios.get(
      "http://api.openweathermap.org/data/2.5/air_pollution",
      {
        params: {
          lat: weatherData.coord.lat,
          lon: weatherData.coord.lon,
          appid: "ace1ffcc9ac4cab7456a6d14fdc483e7", // Provide your OpenWeatherAPI key
        },
      }
    );

    const airData = responseAir.data;
    const airDataEntry = new AirData({
      username: req.session.user.username,
      city: cityName,
      aiq: airData.list[0].main.aqi,
      createdAt: Date.now(),
    });
    await airDataEntry.save();
    res.render("airquality", { airQualityData: airData, city: cityName });
  } catch (error) {
    res.send(`Error fetching weather data for ${cityName}: ${error.message}`);
  }
});

app.get("/weather/history", async (req, res) => {
  try {
    const weatherData = await WeatherData.find({
      username: req.session.user.username,
    });
    const userData = await UserData.find({
      username: req.session.user.username,
    });
    const airData = await AirData.find({
      username: req.session.user.username,
    });

    res.render("weather_history", {
      weatherData: weatherData,
      user: userData,
      airData: airData,
    });
  } catch (error) {
    console.error("Error retrieving weather data:", error.message);
    res.status(500).render("error");
  }
});

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).render("error", { message: "Access denied" });
  }
};

app.get("/admin", isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.render("admin", { users: users });
  } catch (error) {
    console.error("Error retrieving users:", error.message);
    res.status(500).render("error");
  }
});
app.post("/admin/user/add", async (req, res) => {
  const { username, password, isAdmin } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, isAdmin });
    await newUser.save();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding user:", error.message);
    res.status(500).render("error");
  }
});

app.get("/admin/user/edit/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render("error", { message: "User not found" });
    }
    res.render("edit_user", { user: user });
  } catch (error) {
    console.error("Error retrieving user for editing:", error.message);
    res.status(500).render("error");
  }
});

app.post("/admin/user/edit/:userId", async (req, res) => {
  const { username, password, isAdmin } = req.body;
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render("error", { message: "User not found" });
    }
    user.username = username;
    user.password = await bcrypt.hash(password, 10);
    user.isAdmin = isAdmin;
    user.updatedAt = Date.now();
    await user.save();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error editing user:", error.message);
    res.status(500).render("error");
  }
});

app.post("/admin/user/delete/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await User.findByIdAndDelete(userId);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).render("error");
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
