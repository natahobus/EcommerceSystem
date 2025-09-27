package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Payment struct {
	ID       string  `json:"id"`
	OrderID  string  `json:"orderId"`
	Amount   float64 `json:"amount"`
	Method   string  `json:"method"`
	Status   string  `json:"status"`
	Created  time.Time `json:"created"`
}

type PaymentRequest struct {
	OrderID string  `json:"orderId"`
	Amount  float64 `json:"amount"`
	Method  string  `json:"method"`
}

type NotificationMessage struct {
	Type    string      `json:"type"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan NotificationMessage)

func main() {
	r := mux.NewRouter()
	
	// CORS middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			
			if r.Method == "OPTIONS" {
				return
			}
			
			next.ServeHTTP(w, r)
		})
	})

	// Routes
	r.HandleFunc("/api/payments", processPayment).Methods("POST")
	r.HandleFunc("/ws", handleWebSocket)
	
	// Start WebSocket message handler
	go handleMessages()
	
	fmt.Println("Payment Service running on :8081")
	log.Fatal(http.ListenAndServe(":8081", r))
}

func processPayment(w http.ResponseWriter, r *http.Request) {
	var req PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Simulate payment processing
	payment := Payment{
		ID:      generateID(),
		OrderID: req.OrderID,
		Amount:  req.Amount,
		Method:  req.Method,
		Created: time.Now(),
	}

	// Simulate random success/failure
	if rand.Float32() > 0.2 { // 80% success rate
		payment.Status = "approved"
		
		// Send notification
		notification := NotificationMessage{
			Type:    "payment_success",
			Message: fmt.Sprintf("Pagamento de R$%.2f aprovado!", payment.Amount),
			Data:    payment,
		}
		broadcast <- notification
		
	} else {
		payment.Status = "declined"
		
		notification := NotificationMessage{
			Type:    "payment_failed",
			Message: "Pagamento recusado. Tente novamente.",
			Data:    payment,
		}
		broadcast <- notification
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	clients[conn] = true
	fmt.Println("Client connected")

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			delete(clients, conn)
			break
		}
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
	}
}

func generateID() string {
	return fmt.Sprintf("pay_%d", time.Now().UnixNano())
}