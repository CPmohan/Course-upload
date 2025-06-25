function CustomButton(props) {
  return (
    <button
      onClick={props.onClick}
      className={`
        ${props.danger ? "bg-red" : "bg-primary"}
        ${props.smallFont ? "p-1 text-sm" : "p-2 text-md"}
        w-full text-white tracking-wider rounded
        ${props.others || ""}
      `}
    >
      {props.label}
    </button>
  );
}

export default CustomButton;



// function CustomButton(props) {
//     return <button className={` w-full p-2 text-md text-white tracking-wider font-medium rounded-md mt-${props.margin} ${props.danger?'bg-red':'bg-primary'}`} onClick={props.onClick} >{props.label}</button>
// }

// export default CustomButton