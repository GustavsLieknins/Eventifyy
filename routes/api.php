<?php

use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\TelemetryController;
use App\Http\Controllers\Api\TravelController;
use Illuminate\Support\Facades\Route;

Route::get('/events', [EventController::class, 'search']);
Route::get('/travel/flights', [TravelController::class, 'flights']);
Route::get('/travel/hotels', [TravelController::class, 'hotels']);
Route::get('/geo/airports', [GeoController::class, 'airports']);

Route::post('/telemetry/visit', [TelemetryController::class, 'visit']);
