// =====================================================
// AC CARE - MAIN JAVASCRIPT
// =====================================================


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("AC CARE website loaded successfully.");


    // =================================================
    // ACTIVE NAVIGATION
    // =================================================

    const currentPage =
        window.location.pathname.split("/").pop();

    const navigationLinks =
        document.querySelectorAll(".navbar a");

    navigationLinks.forEach(function (link) {

        const linkPage =
            link.getAttribute("href");

        if (linkPage === currentPage) {
            link.classList.add("active");
        }

    });


    // =================================================
    // CUSTOMER REGISTRATION
    // =================================================

    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const name =
                    document.getElementById("name").value.trim();

                const phone =
                    document.getElementById("phone").value.trim();

                const email =
                    document.getElementById("email").value.trim();

                const address =
                    document.getElementById("address").value.trim();

                const password =
                    document.getElementById("password").value;

                const confirmPassword =
                    document.getElementById("confirmPassword").value;


                if (password !== confirmPassword) {

                    alert("Passwords do not match.");

                    return;
                }


                try {

                    const response =
                        await fetch(
                            "http://localhost:5000/api/customers/register",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    full_name: name,
                                    phone: phone,
                                    email: email,
                                    address: address,
                                    password: password

                                })
                            }
                        );


                    const result =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            result.message ||
                            "Registration failed."
                        );

                        return;
                    }


                    alert(
                        "Registration successful! You can now login."
                    );


                    window.location.href =
                        "login.html";


                } catch (error) {

                    console.error(
                        "Registration error:",
                        error
                    );

                    alert(
                        "Cannot connect to server. Please make sure the backend is running."
                    );

                }

            }
        );

    }
 // =================================================
// CUSTOMER / TECHNICIAN LOGIN
// =================================================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document.getElementById("loginEmail").value.trim();

            const password =
                document.getElementById("loginPassword").value;

            const loginRole =
                localStorage.getItem("loginRole") || "customer";


            // ==========================================
            // TECHNICIAN LOGIN
            // ==========================================

            if (loginRole === "technician") {

                try {

                    const response =
                        await fetch(
                            "http://localhost:5000/api/technicians/login",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    email: email,
                                    password: password
                                })
                            }
                        );


                    const result =
                        await response.json();


                    if (!response.ok || !result.success) {

                        alert(
                            result.message ||
                            "Technician login failed."
                        );

                        return;
                    }


                    // Save technician information

                    localStorage.setItem(
                        "technicianId",
                        result.technician.id
                    );

                    localStorage.setItem(
                        "technicianName",
                        result.technician.full_name
                    );

                    localStorage.setItem(
                        "technicianEmail",
                        result.technician.email
                    );

                    localStorage.setItem(
                        "technician",
                        JSON.stringify(result.technician)
                    );


                    alert(
                        "Technician login successful!"
                    );


                    // Open technician dashboard

                    window.location.href =
                        "technician/dashboard.html";

                }

                catch (error) {

                    console.error(
                        "Technician login error:",
                        error
                    );

                    alert(
                        "Cannot connect to server. Please make sure the backend is running."
                    );

                }

                return;
            }


            // ==========================================
            // CUSTOMER LOGIN
            // ==========================================

            if (loginRole === "customer") {

                try {

                    const response =
                        await fetch(
                            "http://localhost:5000/api/customers/login",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    email: email,
                                    password: password
                                })
                            }
                        );


                    const result =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            result.message ||
                            "Login failed."
                        );

                        return;
                    }


                    localStorage.setItem(
                        "customer",
                        JSON.stringify(
                            result.customer
                        )
                    );


                    alert(
                        "Login successful!"
                    );


                    window.location.href =
                        "customer/dashboard.html";

                }

                catch (error) {

                    console.error(
                        "Customer login error:",
                        error
                    );

                    alert(
                        "Cannot connect to server. Please make sure the backend is running."
                    );

                }

                return;
            }


            
            // ==========================================
            // ADMIN LOGIN
            // ==========================================

            if (loginRole === "admin") {
                try {
                    const response = await fetch(
                        "http://localhost:5000/api/admin/login",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                email: email,
                                password: password
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        alert(result.message || "Admin login failed.");
                        return;
                    }

                    localStorage.setItem(
                        "admin",
                        JSON.stringify(result.admin)
                    );

                    alert("Admin login successful!");

                    window.location.href = "admin/dashboard.html";

                } catch (error) {
                    console.error("Admin login error:", error);
                    alert("Cannot connect to server. Check that the backend is running.");
                }

                return;
            }
        }
    );

}
    // =================================================
    // BOOKING PAGE
    // =================================================

    const bookingForm =
        document.getElementById("bookingForm");

    if (bookingForm) {

        const customerData =
            localStorage.getItem("customer");


        if (!customerData) {

            alert(
                "Please login first to book a service."
            );

            window.location.href =
                "login.html";

            return;
        }


        const customer =
            JSON.parse(customerData);


        // Fill customer information automatically

        const bookingName =
            document.getElementById("bookingName");

        const bookingPhone =
            document.getElementById("bookingPhone");

        const bookingEmail =
            document.getElementById("bookingEmail");

        const bookingAddress =
            document.getElementById("bookingAddress");


        if (bookingName) {
            bookingName.value =
                customer.full_name || "";
        }


        if (bookingPhone) {
            bookingPhone.value =
                customer.phone || "";
        }


        if (bookingEmail) {
            bookingEmail.value =
                customer.email || "";
        }


        if (bookingAddress) {
            bookingAddress.value =
                customer.address || "";
        }


        // Submit booking

        bookingForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const acType =
                    document.getElementById("acType").value;

                const service =
                    document.getElementById(
                        "serviceRequired"
                    ).value;

                const date =
                    document.getElementById(
                        "bookingDate"
                    ).value;

                const time =
                    document.getElementById(
                        "bookingTime"
                    ).value;

                const problemDescription =
                    document.getElementById(
                        "problemDescription"
                    ).value.trim();


                if (
                    !acType ||
                    !service ||
                    !date ||
                    !time
                ) {

                    alert(
                        "Please complete all required booking details."
                    );

                    return;
                }


                try {

                    const response =
                        await fetch(
                            "http://localhost:5000/api/bookings",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    customer_id:
                                        customer.id,

                                    ac_type:
                                        acType,

                                    service_name:
                                        service,

                                    address:
                                        bookingAddress.value.trim(),

                                    preferred_date:
                                        date,

                                    preferred_time:
                                        convertToMySQLTime(time),

                                    problem_description:
                                        problemDescription

                                })
                            }
                        );


                    const result =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            result.message ||
                            "Booking failed."
                        );

                        return;
                    }


                    // Show success details

                    document.getElementById(
                        "successBookingId"
                    ).textContent =
                        result.booking.booking_id;


                    document.getElementById(
                        "successService"
                    ).textContent =
                        result.booking.service_name;


                    document.getElementById(
                        "successDate"
                    ).textContent =
                        result.booking.preferred_date;


                    document.getElementById(
                        "successTime"
                    ).textContent =
                        formatBookingTime(
                            result.booking.preferred_time
                        );


                    bookingForm.style.display =
                        "none";


                    document.getElementById(
                        "bookingSuccess"
                    ).classList.add("show");


                    alert(
                        "Booking created successfully!"
                    );


                } catch (error) {

                    console.error(
                        "Booking error:",
                        error
                    );

                    alert(
                        "Cannot connect to server. Please make sure the backend is running."
                    );

                }

            }
        );

    }



    // =================================================
    // CUSTOMER DASHBOARD
    // =================================================

    const customerDashboardName =
        document.getElementById("customerName");

    const welcomeCustomerName =
        document.getElementById(
            "welcomeCustomerName"
        );

if (
    customerDashboardName ||
    welcomeCustomerName
) {
    loadCustomerDashboard();
    loadCustomerUPIPayments();
}

// Load payments page independently
if (document.getElementById("customerPaymentBookings")) {
    loadCustomerUPIPayments();
}
    
async function loadCustomerUPIPayments() {
    const list = document.getElementById("customerPaymentBookings");
    if (!list) return;

    const customerData = localStorage.getItem("customer");

    if (!customerData) {
        list.textContent = "Please log in to view your payments.";
        return;
    }

    let customer;

    try {
        customer = JSON.parse(customerData);
    } catch {
        list.textContent = "Customer login data is invalid. Please log in again.";
        return;
    }

    if (!customer || !customer.id) {
        list.textContent = "Customer ID not found. Please log in again.";
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:5000/api/bookings/customer/${encodeURIComponent(customer.id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not load bookings.");
        }

        const bookings = result.bookings || [];
        const completed = bookings.filter(
            booking => String(booking.status).toLowerCase() === "completed"
        );

        list.replaceChildren();

        if (completed.length === 0) {
            list.textContent = "No completed bookings are available for payment yet.";
            return;
        }

        completed.forEach(booking => {
            const card = document.createElement("div");
            card.style.cssText =
                "padding:16px;margin:12px 0;border:1px solid #ddd;border-radius:10px;";

            const title = document.createElement("h3");
            title.textContent = booking.booking_id || `Booking #${booking.id}`;

            const service = document.createElement("p");
            service.textContent = booking.service_name || "AC Service";

            const amount = document.createElement("p");
            amount.textContent =
                "Amount: ₹" + Number(booking.total_amount || 0).toFixed(2);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "primary-btn";
            button.textContent = "View UPI Payment";

            button.addEventListener("click", () => {
                document.getElementById("upiDatabaseBookingId").value = booking.id;
                document.getElementById("upiBookingReference").textContent =
                    booking.booking_id || `Booking #${booking.id}`;
                document.getElementById("upiPaymentAmount").textContent =
                    "₹" + Number(booking.total_amount || 0).toFixed(2);
                document.getElementById("upiPaymentPanel").style.display = "block";
                document.getElementById("upiPaymentMessage").textContent = "";
                document.getElementById("upiPaymentPanel").scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });

            card.append(title, service, amount, button);
            list.appendChild(card);
        });
    } catch (error) {
        console.error("UPI booking load error:", error);
        list.textContent = "Unable to load bookings. Check that the backend is running.";
    }
}

    // =====================================================
    // SUBMIT UPI PAYMENT REFERENCE
    // =====================================================

    const upiReferenceForm =
        document.getElementById("upiReferenceForm");

    if (upiReferenceForm) {
        upiReferenceForm.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                const bookingId =
                    document.getElementById(
                        "upiDatabaseBookingId"
                    ).value;

                const transactionReference =
                    document.getElementById(
                        "upiTransactionReference"
                    ).value.trim();

                const message =
                    document.getElementById(
                        "upiPaymentMessage"
                    );

                if (!bookingId || !transactionReference) {
                    message.textContent =
                        "Please enter the transaction reference.";
                    return;
                }

                const submitButton =
                    upiReferenceForm.querySelector(
                        'button[type="submit"]'
                    );

                submitButton.disabled = true;
                message.textContent =
                    "Submitting reference...";

                try {
                    const response = await fetch(
                        "http://localhost:5000/api/customer/payments/upi-reference",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                bookingId: Number(bookingId),
                                transactionReference:
                                    transactionReference
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        throw new Error(
                            result.message ||
                            "Could not submit the reference."
                        );
                    }

                    message.textContent =
                        "Reference submitted successfully. Payment is pending verification.";

                    document.getElementById(
                        "upiTransactionReference"
                    ).value = "";

                } catch (error) {
                    console.error(
                        "UPI reference error:",
                        error
                    );

                    message.textContent =
                        error.message ||
                        "Unable to submit the reference. Check the backend.";
                } finally {
                    submitButton.disabled = false;
                }
            }
        );
    }





    // =================================================
    // MY BOOKINGS PAGE
    // =================================================

    const bookingsTableBody =
        document.getElementById(
            "bookingsTableBody"
        );


    if (bookingsTableBody) {

        loadCustomerBookings();

    }



    // =================================================
    // LOGOUT
    // =================================================

    const logoutLinks =
        document.querySelectorAll(
            'a[href="../index.html"]'
        );


    logoutLinks.forEach(function (link) {

        if (
            link.textContent
                .toLowerCase()
                .includes("logout")
        ) {

            link.addEventListener(
                "click",
                function () {

                    localStorage.removeItem(
                        "customer"
                    );

                }
            );

        }

    });

});



// =====================================================
// LOGIN ROLE SELECTION
// =====================================================

function showLoginForm(role) {

    const container =
        document.getElementById(
            "loginFormContainer"
        );

    const title =
        document.getElementById(
            "loginTitle"
        );


    if (!container || !title) {

        console.error(
            "Login form container not found."
        );

        return;
    }


    if (role === "customer") {
    title.textContent = "Customer Login";
}
else if (role === "technician") {
    title.textContent = "Technician Login";
}
else if (role === "admin") {
    title.textContent = "Admin Login";
}

// Save selected login role
localStorage.setItem("loginRole", role);


    container.classList.add("show");

    container.style.display =
        "block";


    container.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}



// =====================================================
// CUSTOMER DASHBOARD
// =====================================================

async function loadCustomerDashboard() {

    const customerData =
        localStorage.getItem("customer");


    if (!customerData) {

        alert(
            "Please login first."
        );

        window.location.href =
            "../login.html";

        return;
    }


    const customer =
        JSON.parse(customerData);


    // Customer name

    const customerName =
        document.getElementById(
            "customerName"
        );


    if (customerName) {

        customerName.textContent =
            customer.full_name;

    }


    // Welcome message

    const welcomeCustomerName =
        document.getElementById(
            "welcomeCustomerName"
        );


    if (welcomeCustomerName) {

        welcomeCustomerName.textContent =
            customer.full_name;

    }


    // Avatar

    const customerAvatar =
        document.getElementById(
            "customerAvatar"
        );


    if (customerAvatar) {

        customerAvatar.textContent =
            customer.full_name
                .charAt(0)
                .toUpperCase();

    }
   

    try {

        const response =
            await fetch(
                `http://localhost:5000/api/customer/dashboard/${customer.id}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            console.error(
                "Dashboard API error:",
                result.message
            );

            return;
        }


        if (!result.success) {
            return;
        }


        const data =
            result.data;


        const totalBookings =
            document.getElementById(
                "totalBookings"
            );


        const pendingBookings =
            document.getElementById(
                "pendingBookings"
            );


        const completedBookings =
            document.getElementById(
                "completedBookings"
            );


        const totalSpent =
            document.getElementById(
                "totalSpent"
            );


        if (totalBookings) {

            totalBookings.textContent =
                data.totalBookings;

        }


        if (pendingBookings) {

            pendingBookings.textContent =
                data.pendingBookings;

        }


        if (completedBookings) {

            completedBookings.textContent =
                data.completedBookings;

        }


        if (totalSpent) {

            totalSpent.textContent =
                "₹" +
                Number(
                    data.totalSpent || 0
                ).toLocaleString("en-IN");

        }


    } catch (error) {

        console.error(
            "Customer dashboard error:",
            error
        );

    }

}



// =====================================================
// MY BOOKINGS
// =====================================================

async function loadCustomerBookings() {

    const customerData =
        localStorage.getItem("customer");


    if (!customerData) {

        alert(
            "Please login first."
        );

        window.location.href =
            "../login.html";

        return;
    }


    const customer =
        JSON.parse(customerData);


    const customerName =
        document.getElementById(
            "customerName"
        );


    if (customerName) {

        customerName.textContent =
            customer.full_name;

    }


    const customerAvatar =
        document.getElementById(
            "customerAvatar"
        );


    if (customerAvatar) {

        customerAvatar.textContent =
            customer.full_name
                .charAt(0)
                .toUpperCase();

    }


    const tableBody =
        document.getElementById(
            "bookingsTableBody"
        );


    try {

        const response =
            await fetch(
                `http://localhost:5000/api/bookings/customer/${customer.id}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Failed to load bookings."
            );

            return;
        }


        if (result.success) {

            displayCustomerBookings(
                result.bookings
            );

        }


    } catch (error) {

        console.error(
            "My Bookings error:",
            error
        );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9"
                        style="text-align:center; padding:30px;">
                        Cannot connect to server.
                    </td>
                </tr>
            `;

        }

    }

}



// =====================================================
// DISPLAY CUSTOMER BOOKINGS
// =====================================================

function displayCustomerBookings(bookings) {

    const tableBody =
        document.getElementById(
            "bookingsTableBody"
        );


    const noBookings =
        document.getElementById(
            "noBookings"
        );


    if (!tableBody) {
        return;
    }


    // Remove demo bookings

    tableBody.innerHTML = "";


    // No bookings

    if (
        !bookings ||
        bookings.length === 0
    ) {

        if (noBookings) {

            noBookings.style.display =
                "block";

        }


        updateBookingStats([]);

        return;
    }


    if (noBookings) {

        noBookings.style.display =
            "none";

    }


    bookings.forEach(function (booking) {

        const row =
            document.createElement("tr");


        const date =
            formatBookingDate(
                booking.preferred_date
            );


        const time =
            formatBookingTime(
                booking.preferred_time
            );


        const amount =
            Number(
                booking.total_amount || 0
            ).toLocaleString("en-IN");


        const statusClass =
            getStatusClass(
                booking.status
            );

        
let actionButton = "";

const bookingId = booking.booking_id || booking.id;
console.log("Booking ID:", bookingId);
if (
    booking.status !== "Completed" &&
    booking.status !== "Cancelled"
) {
    
actionButton = `
    <a href="track-service.html?id=${encodeURIComponent(bookingId)}"
       class="table-button">
        Track
    </a>
`;
} else {
    actionButton = `
        <a href="track-service.html?id=${encodeURIComponent(bookingId)}"
           class="table-button">
            View
        </a>
    `;
}


        row.innerHTML = `

            <td>
                ${booking.booking_id || "--"}
            </td>

            <td>
                ${booking.service_name || "--"}
            </td>

            <td>
                ${booking.ac_type || "--"}
            </td>

            <td>
                ${date}
            </td>

            <td>
                ${time}
            </td>

            <td>
                ${booking.technician_name || "Not Assigned"}
            </td>

            <td>
                ₹${amount}
            </td>

            <td>
                <span class="status ${statusClass}">
                    ${booking.status || "Pending"}
                </span>
            </td>

            <td>
                ${actionButton}
            </td>

        `;


        tableBody.appendChild(row);

    });


    updateBookingStats(bookings);

}



// =====================================================
// BOOKING STATISTICS
// =====================================================

function updateBookingStats(bookings) {

    const totalBookings =
        document.getElementById(
            "totalBookings"
        );


    const pendingBookings =
        document.getElementById(
            "pendingBookings"
        );


    const completedBookings =
        document.getElementById(
            "completedBookings"
        );


    const totalSpent =
        document.getElementById(
            "totalSpent"
        );


    const total =
        bookings.length;


    const pending =
        bookings.filter(function (booking) {

            return booking.status === "Pending";

        }).length;


    const completed =
        bookings.filter(function (booking) {

            return booking.status === "Completed";

        }).length;


    const spent =
        bookings
            .filter(function (booking) {

                return booking.status === "Completed";

            })
            .reduce(function (sum, booking) {

                return (
                    sum +
                    Number(
                        booking.total_amount || 0
                    )
                );

            }, 0);


    if (totalBookings) {

        totalBookings.textContent =
            total;

    }


    if (pendingBookings) {

        pendingBookings.textContent =
            pending;

    }


    if (completedBookings) {

        completedBookings.textContent =
            completed;

    }


    if (totalSpent) {

        totalSpent.textContent =
            "₹" +
            spent.toLocaleString("en-IN");

    }

}



// =====================================================
// FORMAT DATE
// =====================================================

function formatBookingDate(date) {

    if (!date) {
        return "--";
    }


    const formattedDate =
        new Date(date);


    if (isNaN(formattedDate.getTime())) {
        return date;
    }


    return formattedDate.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}



// =====================================================
// CONVERT TIME TO MYSQL FORMAT
// =====================================================

function convertToMySQLTime(time) {

    if (!time) {
        return null;
    }


    const parts =
        time.trim().split(" ");


    if (parts.length < 2) {
        return time;
    }


    const timePart =
        parts[0];

    const period =
        parts[1].toUpperCase();


    let timeParts =
        timePart.split(":");


    let hour =
        parseInt(
            timeParts[0],
            10
        );


    const minute =
        timeParts[1];


    if (
        period === "PM" &&
        hour !== 12
    ) {

        hour += 12;

    }


    if (
        period === "AM" &&
        hour === 12
    ) {

        hour = 0;

    }


    return (
        String(hour).padStart(2, "0") +
        ":" +
        minute +
        ":00"
    );

}



// =====================================================
// FORMAT MYSQL TIME
// =====================================================

function formatBookingTime(time) {

    if (!time) {
        return "--";
    }


    const parts =
        String(time).split(":");


    if (parts.length < 2) {
        return time;
    }


    let hour =
        parseInt(
            parts[0],
            10
        );


    const minute =
        parts[1];


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    if (hour === 0) {

        hour = 12;

    }
    else if (hour > 12) {

        hour -= 12;

    }


    return (
        hour +
        ":" +
        minute +
        " " +
        period
    );

}



// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    switch (status) {

        case "Pending":
            return "pending";

        case "Assigned":
            return "assigned";

        case "Accepted":
            return "accepted";

        case "In Progress":
            return "in-progress";

        case "Completed":
            return "completed";

        case "Cancelled":
            return "cancelled";

        default:
            return "pending";

    }

}
// =====================================
// ADMIN MONTHLY REVENUE CHART
// =====================================

async function loadMonthlyRevenue() {
    const totalElement = document.getElementById("monthlyRevenueTotal");
    const growthElement = document.getElementById("monthlyRevenueGrowth");
    const barsElement = document.getElementById("revenueChartBars");
    const monthsElement = document.getElementById("revenueChartMonths");
    const valuesElement = document.getElementById("revenueChartValues");
    const yearSelect = document.getElementById("revenueYearSelect");

    // Do nothing on pages without the revenue chart.
    if (!totalElement || !barsElement || !monthsElement ||
        !valuesElement || !yearSelect) {
        return;
    }

    const selectedYear = yearSelect.value;
    const year = selectedYear === "current"
        ? new Date().getFullYear()
        : Number(selectedYear);

    totalElement.textContent = "Loading...";
    growthElement.textContent = "Loading revenue data...";

    try {
        const response = await fetch(
            `http://localhost:5000/api/admin/reports/monthly-revenue?year=${year}`
        );

        const result = await response.json();

        if (!response.ok || !result.success ||
            !Array.isArray(result.monthlyRevenue)) {
            throw new Error(result.message || "Unable to load revenue");
        }

        const rows = result.monthlyRevenue;
        const revenueByMonth = new Map(
            rows.map(row => [
                Number(row.monthKey.split("-")[1]),
                Number(row.revenue) || 0
            ])
        );

        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const revenue = months.map((_, index) =>
            revenueByMonth.get(index + 1) || 0
        );

        const total = revenue.reduce((sum, amount) => sum + amount, 0);
        const maxRevenue = Math.max(...revenue, 0);
        const chartMax = maxRevenue > 0
            ? Math.ceil(maxRevenue / 5 / 1000) * 1000 * 5
            : 5000;

        totalElement.textContent = total.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        });

        const now = new Date();
        const previousMonth = new Date(year, now.getMonth() - 1, 1);
        const comparisonMonth = new Date(year, now.getMonth(), 1);

        if (year === now.getFullYear()) {
            const currentMonthRevenue = revenue[now.getMonth()] || 0;
            const previousMonthRevenue = revenue[previousMonth.getMonth()] || 0;

            if (previousMonthRevenue > 0) {
                const change =
                    ((currentMonthRevenue - previousMonthRevenue) /
                    previousMonthRevenue) * 100;

                growthElement.textContent =
                    `${change >= 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}% from last month`;
            } else {
                growthElement.textContent =
                    "Previous month's revenue is zero";
            }
        } else {
            growthElement.textContent = `Revenue for ${year}`;
        }

        // Update the chart's vertical-axis labels.
        valuesElement.replaceChildren();

        for (let step = 5; step >= 0; step--) {
            const label = document.createElement("span");
            label.textContent = `₹${Math.round(
                chartMax * step / 5
            ).toLocaleString("en-IN")}`;
            valuesElement.appendChild(label);
        }

        // Update bars using the real revenue values.
        barsElement.replaceChildren();

        revenue.forEach((amount, index) => {
            const bar = document.createElement("span");
            bar.style.height = `${Math.max(
                amount > 0 ? 2 : 0,
                (amount / chartMax) * 100
            )}%`;

            bar.title = `${months[index]}: ${amount.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            })}`;

            barsElement.appendChild(bar);
        });

        // Update month labels.
        monthsElement.replaceChildren();

        months.forEach(month => {
            const label = document.createElement("span");
            label.textContent = month;
            monthsElement.appendChild(label);
        });

    } catch (error) {
        console.error("Monthly revenue error:", error);
        totalElement.textContent = "Unable to load";
        growthElement.textContent =
            "Check the backend and revenue API.";
        barsElement.textContent = "Revenue data unavailable";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const yearSelect = document.getElementById("revenueYearSelect");

    if (yearSelect) {
        loadMonthlyRevenue();
        yearSelect.addEventListener("change", loadMonthlyRevenue);
    }
});

// =====================================
// LOAD TODAY'S JOBS ON ADMIN DASHBOARD
// =====================================

async function loadTodaysJobs() {
    const container = document.getElementById("adminTodaysJobs");

    if (!container) return;

    container.textContent = "Loading today's jobs...";

    try {
        const response = await fetch(
            "http://localhost:5000/api/admin/todays-jobs"
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load jobs");
        }

        container.replaceChildren();

        if (!Array.isArray(result.jobs) || result.jobs.length === 0) {
            container.textContent = "No jobs scheduled for today.";
            return;
        }

        result.jobs.forEach(job => {
            const card = document.createElement("div");
            card.className = "job-card";

            const title = document.createElement("h3");
            title.textContent = job.service_name || "AC Service";

            const customer = document.createElement("p");
            customer.textContent =
                "Customer: " + (job.customer_name || "Unknown");

            const booking = document.createElement("p");
            booking.textContent =
                "Booking: " + (job.booking_id || job.id || "N/A");

            const technician = document.createElement("p");
            technician.textContent =
                "Technician: " + (job.technician_name || "Not Assigned");

            const time = document.createElement("p");
            time.textContent =
                "Time: " + (job.preferred_time || "Not specified");

            const status = document.createElement("p");
            status.textContent = "Status: " + (job.status || "Pending");

            card.append(title, customer, booking, technician, time, status);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Today's Jobs loading error:", error);
        container.textContent = "Unable to load today's jobs. Check the Console.";
    }
}

document.addEventListener("DOMContentLoaded", loadTodaysJobs);

/* =========================================
   AC CARE - FORGOT PASSWORD
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    const showButton = document.getElementById("showForgotPassword");
    const hideButton = document.getElementById("hideForgotPassword");
    const section = document.getElementById("forgotPasswordSection");
    const form = document.getElementById("forgotPasswordForm");
    const message = document.getElementById("forgotPasswordMessage");
    const submitButton = document.getElementById("sendResetLinkButton");

    // These elements exist only on the login page.
    if (!showButton || !hideButton || !section || !form) {
        return;
    }

    showButton.addEventListener("click", function () {
        section.style.display = "block";
        message.textContent = "";
        section.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    hideButton.addEventListener("click", function () {
        section.style.display = "none";
        form.reset();
        message.textContent = "";
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("resetEmail").value.trim();
        const role = document.getElementById("resetRole").value;

        submitButton.disabled = true;
        message.textContent = "Requesting reset link...";

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, role })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to request a reset link."
                );
            }

            message.textContent =
                result.message ||
                "If an account exists for that email, a reset link will be sent.";
        } catch (error) {
            console.error("Forgot-password request failed:", error);
            message.textContent =
                "Could not send the request. Check that the backend is running and configured.";
        } finally {
            submitButton.disabled = false;
        }
    });
});

/* =========================================
   AC CARE - FORGOT PASSWORD
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    const showButton = document.getElementById("showForgotPassword");
    const hideButton = document.getElementById("hideForgotPassword");
    const section = document.getElementById("forgotPasswordSection");
    const form = document.getElementById("forgotPasswordForm");
    const message = document.getElementById("forgotPasswordMessage");
    const submitButton = document.getElementById("sendResetLinkButton");

    // These elements exist only on the login page.
    if (!showButton || !hideButton || !section || !form) {
        return;
    }

    showButton.addEventListener("click", function () {
        section.style.display = "block";
        message.textContent = "";
        section.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    hideButton.addEventListener("click", function () {
        section.style.display = "none";
        form.reset();
        message.textContent = "";
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("resetEmail").value.trim();
        const role = document.getElementById("resetRole").value;

        submitButton.disabled = true;
        message.textContent = "Requesting reset link...";

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, role })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to request a reset link."
                );
            }

            message.textContent =
                result.message ||
                "If an account exists for that email, a reset link will be sent.";
        } catch (error) {
            console.error("Forgot-password request failed:", error);
            message.textContent =
                "Could not send the request. Check that the backend is running and configured.";
        } finally {
            submitButton.disabled = false;
        }
    });
});

