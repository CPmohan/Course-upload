function AppBadge(props){
    return <div className={`text-center rounded-full px-4 text-white text-sm font-normal bg-${props.color} ${props.others}`} >{props.label}</div>
}

export default AppBadge