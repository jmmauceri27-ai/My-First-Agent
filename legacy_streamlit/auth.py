"""Simple shared-password gate for the private dashboard site."""
import streamlit as st


def check_password() -> None:
    """Stop page execution until the correct shared password is entered."""
    if st.session_state.get("authenticated"):
        return

    st.title("🔒 Facility Maintenance Dashboard")
    st.caption("This site is private. Enter the site password to continue.")

    expected = st.secrets.get("app_password") if hasattr(st, "secrets") else None
    if not expected:
        st.error(
            "No app_password is configured. Set it in `.streamlit/secrets.toml` "
            "(locally) or in your app's Secrets settings (when deployed)."
        )
        st.stop()

    with st.form("login_form"):
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Log in")

    if submitted:
        if password == expected:
            st.session_state["authenticated"] = True
            st.rerun()
        else:
            st.error("Incorrect password.")

    st.stop()


def logout_button() -> None:
    if st.sidebar.button("Log out"):
        st.session_state["authenticated"] = False
        st.rerun()
