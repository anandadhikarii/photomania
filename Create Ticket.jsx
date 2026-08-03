import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';

export default function Ticket({ ticketData }) {
  return (
    
      
        
        Registration Confirmed!
      
      
      
        PHOTO MANIA 2026
        Admit One: {ticketData.name}
        
        {/* The base64 QR code string from the backend goes straight into the src */}
        
          
        
        
        
        
        Ticket ID
        
          {ticketData.ticketId}
        
        
         window.print()}
          className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          
          Save / Print Ticket
        
      
    
  );
}