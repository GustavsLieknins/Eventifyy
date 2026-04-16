<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SuperAdminController extends Controller
{
    private const ROLE_USER = 0;
    private const ROLE_ADMIN = 1;
    private const ROLE_SUPER_ADMIN = 2;

    public function index(Request $request)
    {
        $users = User::orderBy('role', 'desc')->orderBy('name')->get();
        $superAdminCount = User::where('role', self::ROLE_SUPER_ADMIN)->count();
        $currentUser = $request->user();

        return Inertia::render('SuperAdmin/Index', [
            'users'      => $users,
            'superCount' => $superAdminCount,
            'meId'       => $currentUser?->id,
        ]);
    }

    public function promote(User $user, Request $request)
    {
        if ((int) $user->role >= self::ROLE_ADMIN) {
            return back()->with('error', "{$user->name} already has admin privileges.");
        }

        $user->update(['role' => self::ROLE_ADMIN]);

        return back()->with('success', "{$user->name} is now an Admin.");
    }

    public function demote(User $user, Request $request)
    {
        if ($request->user()->id === $user->id) {
            return back()->with('error', 'You cannot change your own role here.');
        }

        if ((int) $user->role <= self::ROLE_USER) {
            return back()->with('error', "{$user->name} is already a User.");
        }

        if ((int) $user->role === self::ROLE_SUPER_ADMIN && $this->isLastSuperAdmin()) {
            return back()->with('error', 'Cannot demote the last SuperAdmin.');
        }

        $user->update(['role' => self::ROLE_USER]);

        return back()->with('success', "{$user->name} is now a User.");
    }

    public function makeSuper(User $user)
    {
        if ((int) $user->role === self::ROLE_SUPER_ADMIN) {
            return back()->with('error', "{$user->name} is already a SuperAdmin.");
        }

        $user->update(['role' => self::ROLE_SUPER_ADMIN]);

        return back()->with('success', "{$user->name} is now a SuperAdmin.");
    }

    public function removeSuper(User $user, Request $request)
    {
        if ($request->user()->id === $user->id) {
            return back()->with('error', 'You cannot remove your own SuperAdmin role.');
        }

        if ((int) $user->role !== self::ROLE_SUPER_ADMIN) {
            return back()->with('error', "{$user->name} is not a SuperAdmin.");
        }

        if ($this->isLastSuperAdmin()) {
            return back()->with('error', 'Cannot remove the last SuperAdmin.');
        }

        $user->update(['role' => self::ROLE_ADMIN]);

        return back()->with('success', "{$user->name} is no longer a SuperAdmin.");
    }

    private function isLastSuperAdmin(): bool
    {
        return User::where('role', self::ROLE_SUPER_ADMIN)->count() <= 1;
    }
}
