// backend/models/Passenger.ts
import mongoose, { Schema, Document } from 'mongoose';

// Passenger interface extending Mongoose Document
export interface IPassenger extends Document {
    PNR_Number: string;
    Name: string;
    Age: number;
    Gender: 'Male' | 'Female' | 'Other';
    PNR_Status: 'CNF' | 'RAC' | 'WL';
    Rac_status?: string;
    Assigned_Coach: string;
    Assigned_Berth: string;
    Berth_Type: string;
    Booking_Class: 'Sleeper' | '3AC';
    Boarding_Station: string;
    Deboarding_Station: string;
    Passenger_Status: 'Online' | 'Offline';
    IRCTC_ID: string;
    Email?: string;
    Boarded?: boolean;
    NO_show?: boolean;
    Deboarded?: boolean;
    Upgraded_From?: string;
}

// Mongoose Schema
const PassengerSchema = new Schema<IPassenger>({
    PNR_Number: { type: String, required: true, unique: true, index: true },
    Name: { type: String, required: true },
    Age: { type: Number, required: true },
    Gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    PNR_Status: { type: String, enum: ['CNF', 'RAC', 'WL'], required: true },
    Rac_status: { type: String, default: '-' },
    Assigned_Coach: { type: String, required: true },
    Assigned_Berth: { type: String, required: true },
    Berth_Type: { type: String, required: true },
    Booking_Class: { type: String, enum: ['Sleeper', '3AC'], required: true },
    Boarding_Station: { type: String, required: true },
    Deboarding_Station: { type: String, required: true },
    Passenger_Status: { type: String, enum: ['Online', 'Offline'], default: 'Offline' },
    IRCTC_ID: { type: String, required: true, index: true },
    Email: { type: String },
    Boarded: { type: Boolean, default: false },
    NO_show: { type: Boolean, default: false },
    Deboarded: { type: Boolean, default: false },
    Upgraded_From: { type: String }
}, {
    timestamps: true,
    collection: 'passengers' // Will be overridden when using dynamic collections
});

// Create indexes for common queries
PassengerSchema.index({ IRCTC_ID: 1 });
PassengerSchema.index({ Boarding_Station: 1 });
PassengerSchema.index({ PNR_Status: 1 });

// Export the model factory function for dynamic collection names
export const getPassengerModel = (collectionName: string) => {
    const modelName = `Passenger_${collectionName}`;

    // Return existing model if already compiled
    if (mongoose.models[modelName]) {
        return mongoose.models[modelName];
    }

    // Create new model with dynamic collection name
    return mongoose.model<IPassenger>(modelName, PassengerSchema, collectionName);
};

// Default export for static collection usage
export default mongoose.model<IPassenger>('Passenger', PassengerSchema);
