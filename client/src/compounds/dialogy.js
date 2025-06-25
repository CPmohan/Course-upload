import { Backdrop, Box, Fade, Modal, Typography } from "@mui/material";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  borderRadius: "8px",
  bgcolor: "background.paper",
  boxShadow: 24,
  outline: "none",
  p: 2,
};

function CustomDialog(props) {
  return (
    <Modal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      open={props.open}
      onClose={props.handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={props.open}>
        <Box
          sx={props.style ? props.style : style}
          className="p-4 w-full max-w-md md:max-w-lg lg:max-w-xl sm:w-4/5 bg-white rounded-lg shadow-lg"
        >
          <div className="flex justify-between items-center">
            {props.title && (
              <Typography
                id="transition-modal-title"
                variant="h6"
                component="h2"
                className="text-lg font-semibold"
              >
                {props.title}
              </Typography>
            )}
            <div>{props.action}</div>
          </div>
          <div className={props.title && "mt-4"}>{props.body}</div>
        </Box>
      </Fade>
    </Modal>
  );
}

export default CustomDialog;
