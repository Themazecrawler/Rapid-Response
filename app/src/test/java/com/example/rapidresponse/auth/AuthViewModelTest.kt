package com.example.rapidresponse.auth

import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.UserProfile
import com.example.rapidresponse.repository.RapidResponseRepository
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.AuthResult
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import io.mockk.Runs
import io.mockk.coEvery
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val firebaseAuth = mockk<FirebaseAuth>(relaxed = true)
    private val repository = mockk<RapidResponseRepository>()
    private val listener = slot<FirebaseAuth.AuthStateListener>()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        every { firebaseAuth.currentUser } returns null
        every { firebaseAuth.addAuthStateListener(capture(listener)) } just Runs
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun create() = AuthViewModel(firebaseAuth, repository)

    private fun idle() = dispatcher.scheduler.advanceUntilIdle()

    @Test
    fun `starts signed out with no role`() {
        val viewModel = create()

        assertNull(viewModel.user.value)
        assertNull(viewModel.role.value)
        assertFalse(viewModel.loading.value)
    }

    @Test
    fun `signing in reports success and clears the loading state`() {
        every { firebaseAuth.signInWithEmailAndPassword("a@example.com", "secret1") } returns
            Tasks.forResult(mockk<AuthResult>())
        val viewModel = create()
        var succeeded = false

        viewModel.signIn("a@example.com", "secret1", onError = { error("unexpected: $it") }) { succeeded = true }
        idle()

        assertTrue(succeeded)
        assertFalse(viewModel.loading.value)
    }

    @Test
    fun `a failed sign-in surfaces the error message`() {
        every { firebaseAuth.signInWithEmailAndPassword(any(), any()) } returns
            Tasks.forException(Exception("The password is invalid"))
        val viewModel = create()
        var message: String? = null

        viewModel.signIn("a@example.com", "wrong", onError = { message = it }, onSuccess = { error("unexpected") })
        idle()

        assertEquals("The password is invalid", message)
        assertFalse(viewModel.loading.value)
    }

    @Test
    fun `registering creates the account, sets the display name and syncs the profile`() {
        val user = mockk<FirebaseUser>()
        val result = mockk<AuthResult>()
        every { result.user } returns user
        every { user.updateProfile(any()) } returns Tasks.forResult(null)
        every { firebaseAuth.createUserWithEmailAndPassword("a@example.com", "secret1") } returns
            Tasks.forResult(result)
        coEvery { repository.syncProfile("Jane", "Main") } returns DataOrException(data = UserProfile(id = 1))
        val viewModel = create()
        var succeeded = false

        viewModel.signUp(
            "a@example.com",
            "secret1",
            "Jane",
            "Main",
            onError = { error("unexpected: $it") }
        ) { succeeded = true }
        idle()

        assertTrue(succeeded)
        verify { user.updateProfile(any()) }
    }

    @Test
    fun `registration reports a profile sync failure instead of pretending it worked`() {
        val user = mockk<FirebaseUser>()
        val result = mockk<AuthResult>()
        every { result.user } returns user
        every { user.updateProfile(any()) } returns Tasks.forResult(null)
        every { firebaseAuth.createUserWithEmailAndPassword(any(), any()) } returns Tasks.forResult(result)
        coEvery { repository.syncProfile(any(), any()) } returns DataOrException(e = Exception("server unavailable"))
        val viewModel = create()
        var message: String? = null

        viewModel.signUp("a@example.com", "secret1", "Jane", "Main", onError = { message = it }, onSuccess = {
            error("unexpected")
        })
        idle()

        assertEquals("server unavailable", message)
        assertFalse(viewModel.loading.value)
    }

    @Test
    fun `registration reports an account creation failure`() {
        every { firebaseAuth.createUserWithEmailAndPassword(any(), any()) } returns
            Tasks.forException(Exception("Email already in use"))
        val viewModel = create()
        var message: String? = null

        viewModel.signUp("a@example.com", "secret1", "Jane", "Main", onError = { message = it }, onSuccess = {
            error("unexpected")
        })
        idle()

        assertEquals("Email already in use", message)
    }

    @Test
    fun `signing out clears the user and role when the auth state changes`() {
        val viewModel = create()

        listener.captured.onAuthStateChanged(firebaseAuth)

        assertNull(viewModel.user.value)
        assertNull(viewModel.role.value)
    }

    @Test
    fun `signOut delegates to Firebase`() {
        create().signOut()

        verify { firebaseAuth.signOut() }
    }
}
