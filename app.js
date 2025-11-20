document.addEventListener("DOMContentLoaded",()=>{
 const loginForm=document.getElementById("loginForm");
 if(loginForm){
   loginForm.addEventListener("submit",e=>{
     e.preventDefault();
     const user=document.getElementById("username").value;
     const pass=document.getElementById("password").value;
     if(user==="admin" && pass==="admin123"){
        localStorage.setItem("user",user);
        window.location="home.html";
     } else {
        document.getElementById("error").textContent="Invalid credentials.";
     }
   });
 }
 const welcome=document.getElementById("welcome");
 if(welcome){
   const user=localStorage.getItem("user");
   welcome.textContent="Welcome, "+user+"!";
 }
});